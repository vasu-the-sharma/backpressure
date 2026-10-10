"use client";

import { Sparkline } from "@/components/Sparkline";
import { KindIcon } from "@/components/icons";
import { SimEngine } from "@/sim/engine";
import type { NodeState, SimState, SystemGraph } from "@/sim/types";
import { useCallback, useEffect, useRef, useState } from "react";

const TICK_MS = 100;
const TICKS_PER_FRAME = 2;
const FRAME_MS = 100;
const SEED = 1;
/** Frames of history kept for the KPI trend lines (~6 s of wall time). */
const HISTORY = 60;
const MAX_REPLICAS = 32;

interface SimulatorProps {
  graph: SystemGraph;
  defaultArrivalRatePerTick: number;
}

type Tone = "ok" | "warn" | "bad" | "neutral";

interface History {
  offered: number[];
  throughput: number[];
  p99: number[];
  errors: number[];
}

const emptyHistory = (): History => ({ offered: [], throughput: [], p99: [], errors: [] });

function push(series: number[], v: number) {
  series.push(v);
  if (series.length > HISTORY) series.shift();
}

function toRps(ratePerTick: number): number {
  return Math.round((ratePerTick * 1000) / TICK_MS);
}

function errorTone(rate: number): Tone {
  return rate > 0.02 ? "bad" : rate > 0.005 ? "warn" : "neutral";
}

function nodeTone(node: NodeState, isBottleneck: boolean): Tone {
  if (node.down || node.utilization >= 0.9) return "bad";
  if (isBottleneck || node.utilization >= 0.75) return "warn";
  return "ok";
}

const TONE_FILL: Record<Tone, string> = {
  ok: "var(--color-ok)",
  warn: "var(--color-warn)",
  bad: "var(--color-bad)",
  neutral: "var(--color-fg-3)",
};
const TONE_TEXT: Record<Tone, string> = {
  ok: "var(--color-fg)",
  warn: "var(--color-warn-fg)",
  bad: "var(--color-bad-fg)",
  neutral: "var(--color-fg)",
};

export function Simulator({ graph, defaultArrivalRatePerTick }: SimulatorProps) {
  const makeEngine = useCallback(
    () =>
      new SimEngine(graph, {
        arrivalRatePerTick: defaultArrivalRatePerTick,
        tickMs: TICK_MS,
        seed: SEED,
      }),
    [graph, defaultArrivalRatePerTick],
  );

  const engineRef = useRef<SimEngine | null>(null);
  if (engineRef.current === null) engineRef.current = makeEngine();
  const historyRef = useRef<History>(emptyHistory());

  const [state, setState] = useState<SimState>(() => (engineRef.current as SimEngine).snapshot());
  const [running, setRunning] = useState(true);
  const [rate, setRate] = useState(defaultArrivalRatePerTick);

  const maxRate = Math.max(defaultArrivalRatePerTick * 4, 20);
  const step = Math.max(1, Math.round(defaultArrivalRatePerTick / 20));

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const engine = engineRef.current;
      if (!engine) return;
      for (let i = 0; i < TICKS_PER_FRAME; i++) engine.tick();
      const snap = engine.snapshot();
      const h = historyRef.current;
      push(h.offered, toRps(engine.getArrivalRatePerTick()));
      push(h.throughput, snap.qps);
      push(h.p99, snap.p99Ms);
      push(h.errors, snap.errorRate);
      setState(snap);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [running]);

  const refresh = useCallback(() => {
    const engine = engineRef.current;
    if (engine) setState(engine.snapshot());
  }, []);

  const changeRate = useCallback((next: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const clamped = Math.max(0, Math.round(next));
    engine.setArrivalRatePerTick(clamped);
    setRate(clamped);
  }, []);

  const setReplicas = useCallback(
    (id: string, replicas: number) => {
      engineRef.current?.setReplicas(id, Math.min(MAX_REPLICAS, Math.max(1, replicas)));
      refresh();
    },
    [refresh],
  );

  const scaleBottleneck = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const snap = engine.snapshot();
    const node = snap.nodes.find((n) => n.id === snap.bottleneckId);
    if (node) setReplicas(node.id, node.replicas + 1);
  }, [setReplicas]);

  const toggleDown = useCallback(
    (id: string, down: boolean) => {
      engineRef.current?.setDown(id, down);
      refresh();
    },
    [refresh],
  );

  const reset = useCallback(() => {
    const engine = makeEngine();
    engineRef.current = engine;
    historyRef.current = emptyHistory();
    setRate(defaultArrivalRatePerTick);
    setState(engine.snapshot());
  }, [makeEngine, defaultArrivalRatePerTick]);

  // The honest "keeping up" signal is the error rate: if nothing overflows a
  // queue, nothing is dropped. Throughput trailing offered by the in-flight
  // amount at 0% errors is healthy, not stress.
  const offered = toRps(rate);
  const eTone = errorTone(state.errorRate);
  const tputTone: Tone = offered === 0 ? "neutral" : eTone === "neutral" ? "ok" : eTone;
  const bottleneck = state.nodes.find((n) => n.id === state.bottleneckId) ?? null;
  const h = historyRef.current;
  const status = describe(state, bottleneck, offered);
  const simSeconds = ((state.tick * TICK_MS) / 1000).toFixed(1);

  return (
    <section aria-label="Live simulator" className="panel overflow-hidden">
      {/* ---------- Toolbar ---------- */}
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="btn btn-primary w-[5.5rem]"
            aria-pressed={running}
          >
            {running ? <PauseIcon /> : <PlayIcon />}
            {running ? "Pause" : "Run"}
          </button>
          <button type="button" onClick={reset} className="btn btn-secondary">
            Reset
          </button>
          <button
            type="button"
            onClick={scaleBottleneck}
            disabled={!bottleneck}
            className="btn btn-secondary"
          >
            Scale bottleneck
          </button>
          <span className="ml-1 text-xs text-fg-3" aria-live="off">
            {running ? "Running" : "Paused"} · <span className="tnum">t={simSeconds}s</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="traffic" className="mr-1 text-xs text-fg-3">
            Traffic
          </label>
          <button
            type="button"
            onClick={() => changeRate(rate * 0.75)}
            disabled={rate === 0}
            className="btn btn-secondary btn-icon"
            aria-label="Decrease traffic"
          >
            −
          </button>
          <input
            id="traffic"
            type="range"
            min={0}
            max={maxRate}
            step={step}
            value={Math.min(rate, maxRate)}
            onChange={(e) => changeRate(Number(e.target.value))}
            className="range w-full min-w-24 sm:w-40"
            aria-valuetext={`${offered.toLocaleString()} requests per second`}
          />
          <button
            type="button"
            onClick={() => changeRate(rate * 1.5 + step)}
            className="btn btn-secondary btn-icon"
            aria-label="Increase traffic"
          >
            +
          </button>
          <output htmlFor="traffic" className="tnum w-24 shrink-0 text-right text-sm">
            {offered.toLocaleString()} <span className="text-xs text-fg-3">rps</span>
          </output>
        </div>
      </div>

      {/* ---------- KPIs ---------- */}
      <dl className="grid grid-cols-2 border-b border-line sm:grid-cols-4">
        <Kpi
          label="Offered"
          value={offered.toLocaleString()}
          unit="rps"
          tone="neutral"
          series={h.offered}
          className="border-r border-b border-line sm:border-b-0"
        />
        <Kpi
          label="Throughput"
          value={Math.round(state.qps).toLocaleString()}
          unit="rps"
          tone={tputTone}
          series={h.throughput}
          seriesMax={Math.max(...h.offered, 1)}
          className="border-b border-line sm:border-r sm:border-b-0"
        />
        <Kpi
          label="P99 latency"
          // With nothing completing there is no latency to report — not "0 ms".
          value={state.qps > 0 ? Math.round(state.p99Ms).toLocaleString() : "—"}
          unit="ms"
          tone={eTone}
          series={h.p99}
          className="border-r border-line"
        />
        <Kpi
          label="Error rate"
          value={(state.errorRate * 100).toFixed(1)}
          unit="%"
          tone={eTone}
          series={h.errors}
          seriesMax={0.05}
        />
      </dl>

      {/* ---------- Nodes ---------- */}
      <div
        aria-hidden
        className="hidden grid-cols-[minmax(0,1fr)_6.5rem_4.5rem_minmax(0,1.3fr)_5.5rem] gap-x-4 border-b border-line bg-surface-2 px-4 py-2 text-xs text-fg-3 sm:grid"
      >
        <span>Node</span>
        <span>Replicas</span>
        <span className="text-right">Queue</span>
        <span>Utilization</span>
        <span />
      </div>
      <ul className="divide-y divide-line">
        {state.nodes.map((node) => (
          <NodeRow
            key={node.id}
            node={node}
            isBottleneck={node.id === state.bottleneckId}
            onReplicas={setReplicas}
            onToggleDown={toggleDown}
          />
        ))}
      </ul>

      {/* ---------- Status line ---------- */}
      <div
        className="flex items-start gap-2 border-t border-line bg-surface-2 px-4 py-2.5 text-xs leading-relaxed text-fg-2"
        aria-live="polite"
      >
        <span
          aria-hidden
          className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: TONE_FILL[status.tone] }}
        />
        <p>{status.text}</p>
      </div>
    </section>
  );
}

function describe(
  state: SimState,
  bottleneck: NodeState | null,
  offered: number,
): { tone: Tone; text: string } {
  const down = state.nodes.filter((n) => n.down);
  if (down.length > 0) {
    return {
      tone: "bad",
      text: `${down.map((n) => n.label).join(", ")} ${down.length > 1 ? "are" : "is"} down. Requests that reach it queue, then drop — upstream tiers keep accepting work nobody can finish.`,
    };
  }
  if (offered === 0) {
    return { tone: "neutral", text: "No traffic. Raise the traffic dial to send load." };
  }
  const util = bottleneck ? Math.round(bottleneck.utilization * 100) : 0;
  if (state.errorRate > 0.005 && bottleneck) {
    return {
      tone: "bad",
      text: `Dropping ${(state.errorRate * 100).toFixed(1)}% of requests. ${bottleneck.label} is the bottleneck at ${util}% — scale it, or cut traffic.`,
    };
  }
  if (bottleneck && bottleneck.utilization >= 0.75) {
    return {
      tone: "warn",
      text: `${bottleneck.label} is at ${util}%. Bursts now queue there, so tail latency climbs before anything drops.`,
    };
  }
  if (bottleneck) {
    return {
      tone: "ok",
      text: `Healthy. Busiest tier is ${bottleneck.label} at ${util}%. Raise traffic to find where it breaks.`,
    };
  }
  return { tone: "neutral", text: "Warming up…" };
}

function Kpi({
  label,
  value,
  unit,
  tone,
  series,
  seriesMax,
  className,
}: {
  label: string;
  value: string;
  unit: string;
  tone: Tone;
  series: number[];
  seriesMax?: number;
  className?: string;
}) {
  return (
    <div className={`min-w-0 px-4 py-3 ${className ?? ""}`}>
      <dt className="text-xs text-fg-3">{label}</dt>
      <dd className="mt-0.5">
        <span className="tnum text-xl tracking-tight" style={{ color: TONE_TEXT[tone] }}>
          {value}
        </span>
        <span className="ml-1 text-xs text-fg-3">{unit}</span>
      </dd>
      <Sparkline
        values={series}
        max={seriesMax}
        width={160}
        height={24}
        color={tone === "neutral" || tone === "ok" ? "var(--color-fg-3)" : TONE_FILL[tone]}
        className="mt-1.5 h-6 w-full"
      />
    </div>
  );
}

function NodeRow({
  node,
  isBottleneck,
  onReplicas,
  onToggleDown,
}: {
  node: NodeState;
  isBottleneck: boolean;
  onReplicas: (id: string, replicas: number) => void;
  onToggleDown: (id: string, down: boolean) => void;
}) {
  const tone = nodeTone(node, isBottleneck);
  const pct = Math.round(node.utilization * 100);
  const isSource = node.kind === "client";

  return (
    <li
      className={`relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-2.5 transition-colors duration-150 ease-out sm:grid-cols-[minmax(0,1fr)_6.5rem_4.5rem_minmax(0,1.3fr)_5.5rem] ${
        isBottleneck ? "bg-warn/[0.07]" : node.down ? "bg-bad/[0.08]" : ""
      }`}
    >
      {(isBottleneck || node.down) && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-0.5"
          style={{ background: node.down ? "var(--color-bad)" : "var(--color-warn)" }}
        />
      )}

      {/* identity */}
      <div className="order-1 flex min-w-0 items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-fg-2">
          <KindIcon kind={node.kind} size={15} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-fg">{node.label}</p>
          <p className="flex items-center gap-1.5 text-xs text-fg-3">
            <span>{node.kind}</span>
            {isBottleneck && !node.down && (
              <span className="font-medium text-warn-fg">· Bottleneck</span>
            )}
            {node.down && <span className="font-medium text-bad-fg">· Down</span>}
          </p>
        </div>
      </div>

      {/* replicas */}
      <div className="order-3 flex items-center gap-1 sm:order-2">
        {isSource ? (
          <span className="text-xs text-fg-3">Traffic source</span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onReplicas(node.id, node.replicas - 1)}
              disabled={node.replicas <= 1}
              className="btn btn-secondary btn-icon-xs"
              aria-label={`Remove a ${node.label} replica`}
            >
              −
            </button>
            <span className="tnum w-8 text-center text-sm" aria-label="replicas">
              ×{node.replicas}
            </span>
            <button
              type="button"
              onClick={() => onReplicas(node.id, node.replicas + 1)}
              disabled={node.replicas >= MAX_REPLICAS}
              className="btn btn-secondary btn-icon-xs"
              aria-label={`Add a ${node.label} replica`}
            >
              +
            </button>
          </>
        )}
      </div>

      {/* queue depth */}
      <span className="order-4 text-right text-xs text-fg-3 sm:order-3">
        <span className="sm:hidden">queue </span>
        <span className="tnum text-sm text-fg">{Math.round(node.queueDepth).toLocaleString()}</span>
      </span>

      {/* utilization */}
      <div className="order-5 col-span-2 flex items-center gap-3 sm:order-4 sm:col-span-1">
        <div
          className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-fill"
          role="meter"
          aria-label={`${node.label} utilization`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={node.down ? 0 : Math.min(100, pct)}
        >
          {node.down ? (
            <div className="hatch-bad h-full w-full" />
          ) : (
            <div
              className="h-full rounded-full transition-[width] duration-300 ease-out"
              style={{ width: `${Math.min(100, pct)}%`, background: TONE_FILL[tone] }}
            />
          )}
        </div>
        <span
          className="tnum w-10 shrink-0 text-right text-xs"
          style={{ color: node.down ? "var(--color-bad-fg)" : TONE_TEXT[tone] }}
        >
          {node.down ? "down" : `${pct}%`}
        </span>
      </div>

      {/* outage control */}
      <div className="order-2 flex justify-end sm:order-5">
        {!isSource && (
          <button
            type="button"
            onClick={() => onToggleDown(node.id, !node.down)}
            className={`btn btn-secondary btn-sm w-[4.75rem] ${node.down ? "" : "btn-danger-hover"}`}
          >
            {node.down ? "Recover" : "Break"}
          </button>
        )}
      </div>
    </li>
  );
}

/* ---------------- control glyphs ---------------- */

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 4.5v15l12.5-7.5z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4.5" width="4" height="15" rx="1" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" />
    </svg>
  );
}
