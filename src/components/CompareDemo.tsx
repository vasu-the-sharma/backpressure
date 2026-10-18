"use client";

import { type Flow, FlowCanvas } from "@/components/FlowCanvas";
import { KindIcon } from "@/components/icons";
import { CheckGlyph } from "@/components/ui";
import {
  DB_CAPACITY_RPS,
  DB_QUEUE_MAX,
  DEMO_FRAME_MS,
  DEMO_GRAPH,
  DEMO_START_S,
  DEMO_TICKS_PER_FRAME,
  DEMO_TICK_MS,
  ratePerTick,
  risingLoadAt,
  risingPhaseAt,
  steadyLoadAt,
} from "@/content/demo";
import { SimEngine } from "@/sim/engine";
import type { NodeState, SimState } from "@/sim/types";
import { useEffect, useId, useRef, useState } from "react";

type Status = "healthy" | "pressure" | "about" | "breaking" | "recovering";
type Tone = "ok" | "warn" | "bad";
type Trend = "up" | "flat" | "down";

const STATUS: Record<Status, { label: string; tone: Tone }> = {
  healthy: { label: "Healthy", tone: "ok" },
  pressure: { label: "Under pressure", tone: "warn" },
  about: { label: "About to break", tone: "bad" },
  breaking: { label: "Breaking", tone: "bad" },
  recovering: { label: "Recovering", tone: "warn" },
};

/** How strongly each status tints its half of the panel. */
const HEAT: Record<Status, { warn: number; bad: number }> = {
  healthy: { warn: 0, bad: 0 },
  pressure: { warn: 0.7, bad: 0 },
  recovering: { warn: 0.45, bad: 0 },
  about: { warn: 0, bad: 0.65 },
  breaking: { warn: 0, bad: 1 },
};

const TONE_FG: Record<Tone, string> = {
  ok: "var(--color-ok-fg)",
  warn: "var(--color-warn-fg)",
  bad: "var(--color-bad-fg)",
};

const FRAME_S = DEMO_FRAME_MS / 1000;
const WARMUP_FRAMES = 15;
/** One dot on screen stands for this many requests per second. */
const RPS_PER_DOT = 250;
/** A status must hold this many frames before its label changes, so it never flickers. */
const SETTLE_FRAMES = 3;

const CHART_SPAN_S = 24;
const CHART_SAMPLES = 73;
/** Fixed and shared by both charts, so the two halves compare directly. Zoomed
 *  toward capacity, so the overload band reads at a glance. */
const CHART_MIN_RPS = 2_000;
const CHART_MAX_RPS = 12_500;
const CW = 300;
const CH = 64;

interface Side {
  key: "steady" | "rising";
  loadAt: (t: number) => number;
  engine: SimEngine;
  snap: SimState;
  status: Status;
  pending: { status: Status; frames: number } | null;
  /** Read by the canvas every animation frame; updated in place. */
  flow: Flow;
  /** When the database ran with two replicas, for the chart's capacity line. */
  scaled: Array<{ from: number; to: number | null }>;
}

const dbOf = (s: SimState): NodeState | undefined => s.nodes.find((n) => n.id === "db");
const replicasOf = (side: Side) => dbOf(side.snap)?.replicas ?? 1;
const toneOf = (util: number): Tone => (util >= 0.98 ? "bad" : util >= 0.75 ? "warn" : "ok");

function classify(s: SimState, offeredRps: number, capacityRps: number): Status {
  const db = dbOf(s);
  const queue = db?.queueDepth ?? 0;
  const util = db?.utilization ?? 0;
  if (s.errorRate >= 0.005) return "breaking";
  if (queue > DB_QUEUE_MAX * 0.02) return offeredRps >= capacityRps ? "about" : "recovering";
  if (util >= 0.98 && offeredRps >= capacityRps * 0.97) return "about";
  if (util >= 0.75) return "pressure";
  return "healthy";
}

function flowOf(snap: SimState, load: number): Flow {
  return {
    rate: (load * DB_CAPACITY_RPS) / RPS_PER_DOT,
    queue: (dbOf(snap)?.queueDepth ?? 0) / DB_QUEUE_MAX,
    drop: snap.errorRate,
  };
}

/** A side warmed up to the opening moment. Seeded, so server and client agree. */
function makeSide(key: Side["key"], loadAt: (t: number) => number, t0: number): Side {
  const engine = new SimEngine(structuredClone(DEMO_GRAPH), {
    arrivalRatePerTick: ratePerTick(loadAt(t0)),
    tickMs: DEMO_TICK_MS,
    seed: key === "steady" ? 11 : 7,
    windowTicks: 100,
  });
  for (let f = WARMUP_FRAMES; f > 0; f--) {
    engine.setArrivalRatePerTick(ratePerTick(loadAt(t0 - f * FRAME_S)));
    for (let i = 0; i < DEMO_TICKS_PER_FRAME; i++) engine.tick();
  }
  const snap = engine.snapshot();
  const load = loadAt(t0);
  return {
    key,
    loadAt,
    engine,
    snap,
    status: classify(snap, load * DB_CAPACITY_RPS, DB_CAPACITY_RPS),
    pending: null,
    flow: flowOf(snap, load),
    scaled: [],
  };
}

function advance(side: Side, t: number) {
  // A scaled-up database holds until the quiet phase; the next rise starts
  // from one replica again, so the break is always there to be fixed.
  const open = side.scaled[side.scaled.length - 1];
  if (open && open.to === null && risingPhaseAt(t) === "quiet") {
    side.engine.setReplicas("db", 1);
    open.to = t;
  }
  const load = side.loadAt(t);
  side.engine.setArrivalRatePerTick(ratePerTick(load));
  for (let i = 0; i < DEMO_TICKS_PER_FRAME; i++) side.engine.tick();
  side.snap = side.engine.snapshot();

  const next = classify(side.snap, load * DB_CAPACITY_RPS, DB_CAPACITY_RPS * replicasOf(side));
  if (next === side.status) side.pending = null;
  else if (side.pending?.status === next) {
    side.pending.frames += 1;
    if (side.pending.frames >= SETTLE_FRAMES) {
      side.status = next;
      side.pending = null;
    }
  } else side.pending = { status: next, frames: 1 };

  Object.assign(side.flow, flowOf(side.snap, load));
  side.scaled = side.scaled.filter((s) => s.to === null || s.to > t - CHART_SPAN_S);
}

/**
 * The landing page's centerpiece: one system, twice, on the real engine. The
 * left half gets steady traffic and stays healthy; the right half's traffic
 * climbs until the database saturates, queues, and drops requests, then
 * recovers. Visitors can scale the struggling database and watch it heal.
 */
export function CompareDemo() {
  const simRef = useRef<{ t: number; steady: Side; rising: Side } | null>(null);
  if (simRef.current === null) {
    simRef.current = {
      t: DEMO_START_S,
      steady: makeSide("steady", steadyLoadAt, DEMO_START_S),
      rising: makeSide("rising", risingLoadAt, DEMO_START_S),
    };
  }
  const sim = simRef.current;
  const rootRef = useRef<HTMLElement | null>(null);
  const [, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);

  // Respect reduced motion: start paused and drop the travelling dots.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      setPlaying(false);
    }
  }, []);

  // Don't burn CPU while scrolled away.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) =>
      setVisible(entries.some((e) => e.isIntersecting)),
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = playing && visible;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      sim.t += FRAME_S;
      advance(sim.steady, sim.t);
      advance(sim.rising, sim.t);
      setFrame((f) => f + 1);
    }, DEMO_FRAME_MS);
    return () => clearInterval(id);
  }, [running, sim]);

  const scaleUp = () => {
    const side = sim.rising;
    if (replicasOf(side) > 1) return;
    side.engine.setReplicas("db", 2);
    side.scaled.push({ from: sim.t, to: null });
    side.snap = side.engine.snapshot();
    setFrame((f) => f + 1);
  };

  return (
    <section
      ref={rootRef}
      aria-label="Live demo: the same system under steady and rising traffic"
      className="panel overflow-hidden text-left"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2 px-4 py-1.5 sm:px-5">
        <span className="inline-flex items-center gap-2 text-xs text-fg-2">
          <span aria-hidden className="live-dot" data-live={running} />
          {playing ? "Live" : "Paused"}
        </span>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="btn btn-ghost btn-sm"
          aria-pressed={playing}
        >
          {playing ? "Pause" : "Play"}
        </button>
      </div>
      <div className="relative grid md:grid-cols-2">
        <SidePanel side={sim.steady} t={sim.t} running={running} reduced={reduced} />
        <SidePanel
          side={sim.rising}
          t={sim.t}
          running={running}
          reduced={reduced}
          onScale={scaleUp}
          className="border-t border-line md:border-t-0 md:border-l"
        />
        <span aria-hidden className="vs-badge">
          vs
        </span>
      </div>
    </section>
  );
}

function SidePanel({
  side,
  t,
  running,
  reduced,
  onScale,
  className = "",
}: {
  side: Side;
  t: number;
  running: boolean;
  reduced: boolean;
  onScale?: () => void;
  className?: string;
}) {
  const { status, snap } = side;
  const { label, tone } = STATUS[status];
  const offered = side.loadAt(t) * DB_CAPACITY_RPS;
  const replicas = replicasOf(side);
  const phase = side.key === "rising" ? risingPhaseAt(t) : "quiet";
  const trend: Trend = phase === "rising" ? "up" : phase === "falling" ? "down" : "flat";
  const canScale = status === "pressure" || status === "about" || status === "breaking";
  const p99 = snap.p99Ms;

  return (
    <article
      aria-label={side.key === "steady" ? "Steady traffic" : "Rising traffic"}
      className={`relative isolate overflow-hidden px-4 pt-4 pb-5 sm:px-6 ${className}`}
    >
      <div aria-hidden className="heat heat-warn" style={{ opacity: HEAT[status].warn }} />
      <div aria-hidden className="heat heat-bad" style={{ opacity: HEAT[status].bad }} />

      <header className="flex items-center justify-between gap-3">
        <p className="status" data-tone={tone}>
          <span aria-hidden className="status-dot" />
          <span key={status} className="status-label">
            {label}
          </span>
        </p>
        <p className="flex items-center gap-1.5 text-xs text-fg-3">
          <span className="tnum text-sm text-fg">{(offered / 1000).toFixed(1)}k</span>
          rps
          <TrendArrow trend={trend} />
        </p>
      </header>

      <Pipeline side={side} running={running} reduced={reduced} breaking={status === "breaking"} />
      <LoadChart side={side} t={t} />

      <footer className="mt-4 flex min-h-11 items-end gap-6">
        <Stat
          label="p99 latency"
          value={Math.round(p99).toLocaleString("en-US")}
          unit="ms"
          tone={p99 >= 400 ? "bad" : p99 >= 100 ? "warn" : undefined}
        />
        <Stat
          label="Dropped"
          value={(snap.errorRate * 100).toFixed(1)}
          unit="%"
          tone={snap.errorRate >= 0.005 ? "bad" : undefined}
        />
        {onScale && (
          <div className="ml-auto flex h-9 items-center">
            {replicas > 1 ? (
              <span className="scaled-note">
                <CheckGlyph size={11} />
                Scaled
              </span>
            ) : canScale ? (
              <button
                type="button"
                onClick={onScale}
                className="scale-cta"
                aria-label="Scale up: add a database replica"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 2v8M2 6h8" />
                </svg>
                Scale up
              </button>
            ) : null}
          </div>
        )}
      </footer>
    </article>
  );
}

function Pipeline({
  side,
  running,
  reduced,
  breaking,
}: {
  side: Side;
  running: boolean;
  reduced: boolean;
  breaking: boolean;
}) {
  const anchors = useRef<(HTMLElement | null)[]>([]);
  return (
    <div className="relative mt-6 h-[78px]">
      <FlowCanvas flow={side.flow} anchors={anchors} running={running} reduced={reduced} />
      <ol className="relative flex justify-between">
        {side.snap.nodes.map((node, i) => {
          const source = node.kind === "client";
          return (
            <li key={node.id} className="flex w-14 flex-col items-center gap-2">
              <span
                ref={(el) => {
                  anchors.current[i] = el;
                }}
                className="pipe-node"
                data-tone={source ? undefined : toneOf(node.utilization)}
                data-source={source || undefined}
                data-breaking={(breaking && node.id === "db") || undefined}
              >
                {!source && <Ring util={node.utilization} />}
                <KindIcon kind={node.kind} size={16} />
                {node.replicas > 1 && <span className="pipe-badge tnum">×{node.replicas}</span>}
              </span>
              <span className="text-[11px] leading-none text-fg-3">{node.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Ring({ util }: { util: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 44 44" className="pipe-ring">
      <circle cx="22" cy="22" r="20.75" pathLength={100} className="pipe-ring-track" />
      <circle
        cx="22"
        cy="22"
        r="20.75"
        pathLength={100}
        className="pipe-ring-fill"
        style={{ strokeDashoffset: 100 - Math.min(1, util) * 100 }}
      />
    </svg>
  );
}

/** Offered load over the last 24 s against the database's capacity; overload turns red. */
function LoadChart({ side, t }: { side: Side; t: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const capAt = (at: number) =>
    DB_CAPACITY_RPS *
    (side.scaled.some((s) => s.from <= at && (s.to === null || at < s.to)) ? 2 : 1);
  const y = (v: number) => {
    const clamped = Math.min(CHART_MAX_RPS, Math.max(CHART_MIN_RPS, v));
    return CH - ((clamped - CHART_MIN_RPS) / (CHART_MAX_RPS - CHART_MIN_RPS)) * CH;
  };

  let line = "";
  let cap = "";
  let top = "";
  let bottom = "";
  let nowRps = 0;
  let nowCap = DB_CAPACITY_RPS;
  for (let i = 0; i < CHART_SAMPLES; i++) {
    const f = i / (CHART_SAMPLES - 1);
    const at = t - CHART_SPAN_S + f * CHART_SPAN_S;
    const rps = side.loadAt(at) * DB_CAPACITY_RPS;
    const c = capAt(at);
    const x = (f * CW).toFixed(1);
    const cmd = i ? "L" : "M";
    line += `${cmd}${x},${y(rps).toFixed(1)}`;
    cap += `${cmd}${x},${y(c).toFixed(1)}`;
    top += `${cmd}${x},${y(Math.max(rps, c)).toFixed(1)}`;
    bottom = `L${x},${y(c).toFixed(1)}${bottom}`;
    nowRps = rps;
    nowCap = c;
  }
  // Everything above the capacity line, and everything below it: the load
  // line is drawn twice, clipped to each, so it turns red only where it's over.
  const capPoints = cap.slice(1);
  const above = `M0,0L${capPoints}L${CW},0Z`;
  const below = `M0,${CH}L${capPoints}L${CW},${CH}Z`;
  const startCap = capAt(t - CHART_SPAN_S);

  return (
    <div className="relative mt-3 h-16">
      <svg
        viewBox={`0 0 ${CW} ${CH}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className="chart-fade absolute inset-0 h-full w-full"
      >
        <defs>
          <clipPath id={`${uid}a`}>
            <path d={above} />
          </clipPath>
          <clipPath id={`${uid}b`}>
            <path d={below} />
          </clipPath>
          <linearGradient id={`${uid}g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-bad)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--color-bad)" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <path d={`${top}${bottom}Z`} fill={`url(#${uid}g)`} />
        <path
          d={line}
          clipPath={`url(#${uid}b)`}
          fill="none"
          stroke="var(--color-fg)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={line}
          clipPath={`url(#${uid}a)`}
          fill="none"
          stroke="var(--color-bad-fg)"
          strokeWidth="1.75"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* Capacity is a fixed reference, so it doesn't fade with the history. */}
      <svg
        viewBox={`0 0 ${CW} ${CH}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <path
          d={cap}
          fill="none"
          stroke="var(--color-warn)"
          strokeOpacity="0.55"
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {startCap < CHART_MAX_RPS && (
        <span aria-hidden className="chart-cap" style={{ top: `${(y(startCap) / CH) * 100}%` }}>
          capacity
        </span>
      )}
      <span
        aria-hidden
        className="chart-now"
        data-over={nowRps > nowCap || undefined}
        style={{ top: `${(y(nowRps) / CH) * 100}%` }}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone?: Tone;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] leading-none text-fg-3">{label}</p>
      <p className="mt-2 whitespace-nowrap leading-none">
        <span
          className="tnum text-2xl tracking-tight transition-colors duration-300"
          style={{ color: tone ? TONE_FG[tone] : undefined }}
        >
          {value}
        </span>
        <span className="ml-1 text-xs text-fg-3">{unit}</span>
      </p>
    </div>
  );
}

function TrendArrow({ trend }: { trend: Trend }) {
  const deg = trend === "up" ? -45 : trend === "down" ? 45 : 0;
  return (
    <>
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="trend"
        style={{ transform: `rotate(${deg}deg)` }}
      >
        <path d="M2 6h8M7 3l3 3-3 3" />
      </svg>
      <span className="sr-only">
        {trend === "up" ? "rising" : trend === "down" ? "falling" : "steady"}
      </span>
    </>
  );
}
