"use client";

import { KindIcon } from "@/components/icons";
import { DEMO_GRAPH, DEMO_PERIOD_FRAMES, DEMO_TICKS_PER_FRAME, demoRateAt } from "@/content/demo";
import { SimEngine } from "@/sim/engine";
import type { NodeState, SimState } from "@/sim/types";
import { Fragment, useEffect, useRef, useState } from "react";

const TICK_MS = 100;
const FRAME_MS = 100;
/** Fixed y-scale so the chart doesn't rescale under the viewer (peak offered is 12,500 rps). */
const Y_MAX = 14_000;
const DB_CAPACITY_RPS = 10_000;
const W = 600;
const H = 180;

function step(engine: SimEngine, frame: number, series: Point[]): SimState {
  const rate = demoRateAt(frame);
  engine.setArrivalRatePerTick(rate);
  for (let i = 0; i < DEMO_TICKS_PER_FRAME; i++) engine.tick();
  const snap = engine.snapshot();
  series.push({ offered: (rate * 1000) / TICK_MS, served: snap.qps });
  if (series.length > DEMO_PERIOD_FRAMES) series.shift();
  return snap;
}

function bootstrap() {
  const engine = new SimEngine(DEMO_GRAPH, {
    arrivalRatePerTick: demoRateAt(0),
    tickMs: TICK_MS,
    seed: 7,
  });
  const series: Point[] = [];
  let frame = 0;
  while (frame < DEMO_PERIOD_FRAMES) step(engine, frame++, series);
  return { engine, series, frame };
}

interface Point {
  offered: number;
  served: number;
}

/**
 * The landing page's centerpiece: the real engine running a read path while
 * offered load sweeps past the database's capacity and back. Nothing here is
 * canned — it is the same simulator every other page uses.
 */
export function LiveDemo() {
  // Pre-run one full load cycle so the chart opens full and in steady state.
  // Seeded, so the server render and the client's first render agree.
  const bootRef = useRef<ReturnType<typeof bootstrap> | null>(null);
  if (bootRef.current === null) bootRef.current = bootstrap();
  const engineRef = useRef(bootRef.current.engine);
  const frameRef = useRef(bootRef.current.frame);
  const seriesRef = useRef(bootRef.current.series);
  const rootRef = useRef<HTMLElement | null>(null);

  const [state, setState] = useState<SimState>(() => engineRef.current.snapshot());
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(true);

  // Respect reduced motion: start paused, let the viewer opt in.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
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

  useEffect(() => {
    if (!playing || !visible) return;
    const id = setInterval(() => {
      const snap = step(engineRef.current, frameRef.current++, seriesRef.current);
      setState(snap);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [playing, visible]);

  const offered = (demoRateAt(Math.max(0, frameRef.current - 1)) * 1000) / TICK_MS;
  const dropping = state.errorRate > 0.005;
  const seconds = ((state.tick * TICK_MS) / 1000).toFixed(1);

  return (
    <section
      ref={rootRef}
      aria-label="Live demo: a read path under a load sweep"
      className="panel overflow-hidden text-left"
    >
      {/* Window bar */}
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2 px-4 py-2.5">
        <p className="truncate text-xs text-fg-2">
          <span className="text-fg">Read path</span> · no cache · load sweeps 50% → 125% of DB
          capacity
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden items-center gap-1.5 text-xs text-fg-3 sm:inline-flex">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${playing ? "bg-ok" : "bg-fg-4"}`}
            />
            {playing ? "Live" : "Paused"} · <span className="tnum">t={seconds}s</span>
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
      </div>

      {/* Pipeline */}
      <ol className="flex items-stretch gap-0 overflow-x-auto border-b border-line px-4 py-5 sm:px-6">
        {state.nodes.map((node, i) => (
          <Fragment key={node.id}>
            {i > 0 && <Wire active={playing} />}
            <Stage node={node} isBottleneck={node.id === state.bottleneckId} />
          </Fragment>
        ))}
      </ol>

      {/* Chart + readouts */}
      <div className="grid md:grid-cols-[minmax(0,1fr)_15rem]">
        <figure className="min-w-0 border-b border-line px-4 py-4 sm:px-6 md:border-r md:border-b-0">
          <figcaption className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-3">
            <span className="text-fg-2">Requests per second</span>
            <Legend swatch={<span className="h-px w-4 border-t border-dashed border-fg-2" />}>
              Offered
            </Legend>
            <Legend swatch={<span className="h-0.5 w-4 bg-fg" />}>Served</Legend>
            <Legend swatch={<span className="h-2 w-3 rounded-[2px] bg-bad/40" />}>
              Over capacity: queued, then dropped
            </Legend>
          </figcaption>
          <Chart series={seriesRef.current} />
        </figure>

        <dl className="grid grid-cols-2 md:grid-cols-1">
          <Readout label="Offered" value={Math.round(offered).toLocaleString()} unit="rps" />
          <Readout label="Served" value={Math.round(state.qps).toLocaleString()} unit="rps" />
          <Readout
            label="P99 latency"
            value={Math.round(state.p99Ms).toLocaleString()}
            unit="ms"
            tone={state.p99Ms > 450 ? "warn" : undefined}
          />
          <Readout
            label="Dropped"
            value={(state.errorRate * 100).toFixed(1)}
            unit="%"
            tone={dropping ? "bad" : undefined}
          />
        </dl>
      </div>
    </section>
  );
}

function Stage({ node, isBottleneck }: { node: NodeState; isBottleneck: boolean }) {
  const pct = Math.round(node.utilization * 100);
  const saturated = node.utilization >= 0.97;
  const color = saturated
    ? "var(--color-bad)"
    : isBottleneck || node.utilization >= 0.75
      ? "var(--color-warn)"
      : "var(--color-ok)";
  const isSource = node.kind === "client";

  return (
    <li
      className="flex w-36 shrink-0 flex-col gap-2.5 rounded-md border bg-surface-2 p-3 transition-colors duration-300 ease-out"
      style={{
        borderColor: saturated
          ? "color-mix(in srgb, var(--color-bad) 55%, transparent)"
          : "var(--color-line-strong)",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-fg-3">
          <KindIcon kind={node.kind} size={14} />
        </span>
        <span className="truncate text-sm text-fg">{node.label}</span>
      </div>
      {isSource ? (
        <p className="text-xs text-fg-3">Traffic source</p>
      ) : (
        <>
          <div className="h-1 overflow-hidden rounded-full bg-fill-2">
            <div
              className="h-full rounded-full transition-[width,background-color] duration-300 ease-out"
              style={{ width: `${Math.min(100, pct)}%`, background: color }}
            />
          </div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="tnum text-fg-2">{pct}%</span>
            <span className="tnum text-fg-3" title="Queue depth">
              q {node.queueDepth.toLocaleString()}
            </span>
          </div>
        </>
      )}
    </li>
  );
}

function Wire({ active }: { active: boolean }) {
  return (
    <li aria-hidden className="flex min-w-6 flex-1 items-center">
      <svg aria-hidden="true" className="h-2 w-full" preserveAspectRatio="none" viewBox="0 0 100 8">
        <line x1="0" y1="4" x2="100" y2="4" stroke="var(--color-line-strong)" strokeWidth="1" />
        <line
          x1="0"
          y1="4"
          x2="100"
          y2="4"
          stroke="var(--color-fg-3)"
          strokeWidth="1"
          strokeDasharray="3 9"
          vectorEffect="non-scaling-stroke"
          className={active ? "animate-[wire_900ms_linear_infinite]" : ""}
        />
      </svg>
    </li>
  );
}

function Chart({ series }: { series: Point[] }) {
  const n = DEMO_PERIOD_FRAMES;
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number) => H - (Math.min(v, Y_MAX) / Y_MAX) * H;
  const capY = y(DB_CAPACITY_RPS);

  let offeredPath = "";
  let servedPath = "";
  let excess = "";
  if (series.length >= 2) {
    offeredPath = series
      .map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.offered).toFixed(1)}`)
      .join("");
    servedPath = series
      .map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.served).toFixed(1)}`)
      .join("");
    // Offered load above the database's capacity: work that can only queue, then drop.
    const top = series.map(
      (p, i) => `${x(i).toFixed(1)},${y(Math.max(p.offered, DB_CAPACITY_RPS)).toFixed(1)}`,
    );
    excess = `M${top.join("L")}L${W},${capY.toFixed(1)}L0,${capY.toFixed(1)}Z`;
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-44 w-full"
        role="img"
        aria-label="Offered versus served requests per second over the last cycle"
      >
        <title>Offered versus served requests per second over the last cycle</title>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            x2={W}
            y1={H * f}
            y2={H * f}
            stroke="var(--color-line)"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <line
          x1="0"
          x2={W}
          y1={capY}
          y2={capY}
          stroke="var(--color-warn)"
          strokeOpacity="0.55"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
        {excess && <path d={excess} fill="var(--color-bad)" fillOpacity="0.28" />}
        {offeredPath && (
          <path
            d={offeredPath}
            fill="none"
            stroke="var(--color-fg-2)"
            strokeWidth="1.25"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {servedPath && (
          <path
            d={servedPath}
            fill="none"
            stroke="var(--color-fg)"
            strokeWidth="1.75"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <span
        className="pointer-events-none absolute right-0 -translate-y-full pb-1 text-[11px] text-warn-fg"
        style={{ top: `${(capY / H) * 100}%` }}
      >
        DB capacity · 10k rps
      </span>
      {series.length < 2 && (
        <p className="absolute inset-0 flex items-center justify-center text-xs text-fg-3">
          Press play to start the run
        </p>
      )}
    </div>
  );
}

function Legend({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {swatch}
      {children}
    </span>
  );
}

function Readout({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone?: "warn" | "bad";
}) {
  const color =
    tone === "bad" ? "var(--color-bad-fg)" : tone === "warn" ? "var(--color-warn-fg)" : undefined;
  return (
    <div className="border-b border-line px-4 py-3 odd:border-r last:border-b-0 md:odd:border-r-0 [&:nth-last-child(2)]:border-b-0 md:[&:nth-last-child(2)]:border-b sm:px-5">
      <dt className="text-xs text-fg-3">{label}</dt>
      <dd className="mt-0.5">
        <span
          className="tnum text-xl tracking-tight transition-colors duration-300"
          style={{ color }}
        >
          {value}
        </span>
        <span className="ml-1 text-xs text-fg-3">{unit}</span>
      </dd>
    </div>
  );
}
