"use client";

import { KindIcon } from "@/components/icons";
import { SimEngine } from "@/sim/engine";
import type { NodeState, SimState, SystemGraph } from "@/sim/types";
import { useCallback, useEffect, useRef, useState } from "react";

const TICK_MS = 100;
const TICKS_PER_FRAME = 2;
const FRAME_MS = 100;
const SEED = 1;

interface SimulatorProps {
  graph: SystemGraph;
  defaultArrivalRatePerTick: number;
}

type Tone = "brand" | "healthy" | "warn" | "danger" | "neutral";

const TONE_VAR: Record<Tone, string> = {
  brand: "var(--color-brand-bright)",
  healthy: "var(--color-healthy)",
  warn: "var(--color-warn)",
  danger: "var(--color-danger)",
  neutral: "var(--color-fg)",
};

function toRps(ratePerTick: number): number {
  return Math.round((ratePerTick * 1000) / TICK_MS);
}

function fillColorVar(node: NodeState, isBottleneck: boolean): string {
  if (node.down) return "var(--color-danger)";
  if (node.utilization >= 0.9) return "var(--color-danger)";
  if (isBottleneck) return "var(--color-warn)";
  if (node.utilization >= 0.75) return "var(--color-warn)";
  return "var(--color-healthy)";
}

export function Simulator({ graph, defaultArrivalRatePerTick }: SimulatorProps) {
  const engineRef = useRef<SimEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new SimEngine(graph, {
      arrivalRatePerTick: defaultArrivalRatePerTick,
      tickMs: TICK_MS,
      seed: SEED,
    });
  }

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
      setState(engine.snapshot());
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [running]);

  const changeRate = useCallback((next: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const clamped = Math.max(0, Math.round(next));
    engine.setArrivalRatePerTick(clamped);
    setRate(clamped);
  }, []);

  const scaleBottleneck = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const snap = engine.snapshot();
    if (!snap.bottleneckId) return;
    const node = snap.nodes.find((n) => n.id === snap.bottleneckId);
    if (node) engine.setReplicas(node.id, node.replicas + 1);
    setState(engine.snapshot());
  }, []);

  const toggleDown = useCallback((id: string, down: boolean) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setDown(id, down);
    setState(engine.snapshot());
  }, []);

  const reset = useCallback(() => {
    const engine = new SimEngine(graph, {
      arrivalRatePerTick: defaultArrivalRatePerTick,
      tickMs: TICK_MS,
      seed: SEED,
    });
    engineRef.current = engine;
    setRate(defaultArrivalRatePerTick);
    setState(engine.snapshot());
  }, [graph, defaultArrivalRatePerTick]);

  // Derived KPI states. The honest "keeping up" signal is the error rate:
  // if nothing overflows a queue, nothing is dropped. Throughput lagging offered
  // by the in-flight amount at 0% errors is healthy, not stress.
  const offered = toRps(rate);
  const throughput = Math.round(state.qps);
  const errorRate = state.errorRate;
  const errorTone: Tone = errorRate > 0.02 ? "danger" : errorRate > 0.005 ? "warn" : "neutral";
  const throughputTone: Tone =
    offered === 0
      ? "neutral"
      : errorRate > 0.02
        ? "danger"
        : errorRate > 0.005
          ? "warn"
          : "healthy";
  const p99Tone: Tone = errorRate > 0.02 ? "danger" : errorRate > 0.005 ? "warn" : "neutral";

  const bottleneckLabel = state.bottleneckId
    ? state.nodes.find((n) => n.id === state.bottleneckId)?.label
    : null;

  return (
    <div className="card overflow-hidden">
      {/* ---------- Control bar ---------- */}
      <div className="flex flex-col gap-4 border-b border-edge p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="btn btn-primary"
            aria-pressed={running}
          >
            {running ? <PauseIcon /> : <PlayIcon />}
            {running ? "Pause" : "Run"}
          </button>
          <button type="button" onClick={reset} className="btn btn-secondary">
            <ResetIcon />
            Reset
          </button>
          <span aria-hidden className="mx-1 h-5 w-px bg-edge" />
          <button
            type="button"
            onClick={scaleBottleneck}
            disabled={!state.bottleneckId}
            className="btn btn-secondary"
          >
            <ScaleIcon />
            Scale bottleneck
          </button>
        </div>

        {/* Traffic dial */}
        <div className="flex items-center gap-3">
          <label
            htmlFor="traffic"
            className="shrink-0 text-xs font-medium uppercase tracking-[0.1em] text-fg-subtle"
          >
            Traffic
          </label>
          <button
            type="button"
            onClick={() => changeRate(rate * 0.75)}
            className="btn btn-secondary btn-xs"
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
            value={rate}
            onChange={(e) => changeRate(Number(e.target.value))}
            className="bp-range w-28 sm:w-40"
            aria-label="Offered traffic"
          />
          <button
            type="button"
            onClick={() => changeRate(rate * 1.5 + step)}
            className="btn btn-secondary btn-xs"
            aria-label="Increase traffic"
          >
            +
          </button>
          <span className="tnum w-[6.5rem] text-right text-sm text-fg">
            {offered.toLocaleString()} <span className="text-fg-subtle">rps</span>
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* ---------- KPI tiles ---------- */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Offered" value={offered.toLocaleString()} unit="rps" tone="brand" />
          <Metric
            label="Throughput"
            value={throughput.toLocaleString()}
            unit="rps"
            tone={throughputTone}
          />
          <Metric
            label="P99 latency"
            value={Math.round(state.p99Ms).toLocaleString()}
            unit="ms"
            tone={p99Tone}
          />
          <Metric
            label="Error rate"
            value={(errorRate * 100).toFixed(1)}
            unit="%"
            tone={errorTone}
            dot={errorTone !== "neutral"}
          />
        </div>

        {/* ---------- Node meters ---------- */}
        <ul className="mt-5 space-y-2">
          {state.nodes.map((node) => {
            const isBottleneck = node.id === state.bottleneckId;
            const pct = Math.round(node.utilization * 100);
            const fill = fillColorVar(node, isBottleneck);
            const rowStyle = isBottleneck
              ? {
                  borderColor: "color-mix(in srgb, var(--color-warn) 45%, transparent)",
                  background: "color-mix(in srgb, var(--color-warn) 6%, transparent)",
                }
              : node.down
                ? {
                    borderColor: "color-mix(in srgb, var(--color-danger) 45%, transparent)",
                    background: "color-mix(in srgb, var(--color-danger) 6%, transparent)",
                  }
                : undefined;

            return (
              <li
                key={node.id}
                className={`relative flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-lg border border-edge px-3 py-2.5 transition-colors ${
                  node.down && !isBottleneck ? "opacity-70" : ""
                }`}
                style={rowStyle}
              >
                {(isBottleneck || node.down) && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 h-full w-0.5 rounded-l-lg"
                    style={{
                      background: isBottleneck ? "var(--color-warn)" : "var(--color-danger)",
                    }}
                  />
                )}

                {/* identity */}
                <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:w-44 sm:flex-none">
                  <span className="mt-0.5 shrink-0 text-fg-subtle">
                    <KindIcon kind={node.kind} size={17} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-fg">{node.label}</span>
                      {node.replicas > 1 && <span className="replica-pill">×{node.replicas}</span>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                        {node.kind}
                      </span>
                      {isBottleneck && (
                        <span
                          className="rounded font-mono text-[9px] font-medium tracking-wider"
                          style={{
                            color: "var(--color-warn)",
                            background: "color-mix(in srgb, var(--color-warn) 14%, transparent)",
                            padding: "1px 4px",
                          }}
                        >
                          BOTTLENECK
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* meter */}
                <div className="relative order-last h-2 w-full overflow-hidden rounded-full border border-edge bg-ink sm:order-none sm:w-auto sm:flex-1">
                  <span
                    aria-hidden
                    className="absolute inset-y-0 w-px bg-white/[0.06]"
                    style={{ left: "75%" }}
                  />
                  <span
                    aria-hidden
                    className="absolute inset-y-0 w-px bg-white/[0.06]"
                    style={{ left: "90%" }}
                  />
                  <div
                    className="h-full rounded-full transition-[width] duration-300 ease-out"
                    style={
                      node.down
                        ? {
                            width: "100%",
                            backgroundColor:
                              "color-mix(in srgb, var(--color-danger) 38%, transparent)",
                            backgroundImage:
                              "repeating-linear-gradient(45deg, color-mix(in srgb, var(--color-danger) 85%, transparent) 0 3px, transparent 3px 7px)",
                          }
                        : {
                            width: `${Math.min(100, pct)}%`,
                            backgroundColor: fill,
                            boxShadow: isBottleneck
                              ? "0 0 10px -1px color-mix(in srgb, var(--color-warn) 75%, transparent)"
                              : undefined,
                          }
                    }
                  />
                </div>

                {/* readout */}
                <span
                  className="tnum w-12 shrink-0 text-right text-xs font-medium"
                  style={{ color: node.down ? "var(--color-danger)" : fill }}
                >
                  {node.down ? "DOWN" : `${pct}%`}
                </span>

                {/* control */}
                <button
                  type="button"
                  onClick={() => toggleDown(node.id, !node.down)}
                  className={`btn btn-xs w-[4.75rem] shrink-0 ${
                    node.down ? "btn-secondary btn-recover" : "btn-secondary btn-break"
                  }`}
                >
                  {node.down ? "Recover" : "Break"}
                </button>
              </li>
            );
          })}
        </ul>

        {bottleneckLabel && (
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-fg-subtle">
            <span
              aria-hidden
              className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: "var(--color-warn)" }}
            />
            <span>
              Bottleneck:{" "}
              <span className="font-medium" style={{ color: "var(--color-warn)" }}>
                {bottleneckLabel}
              </span>
              . Scale it or raise traffic and watch where the limit moves next.
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  tone = "neutral",
  dot = false,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: Tone;
  dot?: boolean;
}) {
  const accent = TONE_VAR[tone];
  const alert = tone === "warn" || tone === "danger";
  const valueColor = tone === "neutral" || tone === "brand" ? "var(--color-fg)" : accent;

  return (
    <div
      className="relative overflow-hidden rounded-lg border bg-raised px-3.5 py-3"
      style={{
        borderColor: alert ? `color-mix(in srgb, ${accent} 40%, transparent)` : "var(--color-edge)",
        boxShadow:
          tone === "danger"
            ? "0 0 0 1px color-mix(in srgb, var(--color-danger) 22%, transparent)"
            : undefined,
      }}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-0.5" style={{ background: accent }} />
      <div className="flex items-center gap-1.5">
        {dot && (
          <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
        )}
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
          {label}
        </span>
      </div>
      <div className="tnum mt-1 text-xl font-semibold sm:text-2xl" style={{ color: valueColor }}>
        {value}
        {unit && <span className="ml-1 text-sm text-fg-subtle">{unit}</span>}
      </div>
    </div>
  );
}

/* ---------------- control glyphs ---------------- */

function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
function ResetIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
function ScaleIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 20V11M12 20V5M19 20v-6" />
    </svg>
  );
}
