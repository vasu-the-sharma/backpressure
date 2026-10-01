"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SimEngine } from "@/sim/engine";
import type { SimState, SystemGraph } from "@/sim/types";

const TICK_MS = 100;
const TICKS_PER_FRAME = 2;
const FRAME_MS = 100;
const SEED = 1;

interface SimulatorProps {
  graph: SystemGraph;
  defaultArrivalRatePerTick: number;
}

function toRps(ratePerTick: number): number {
  return Math.round((ratePerTick * 1000) / TICK_MS);
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

  const [state, setState] = useState<SimState>(() =>
    (engineRef.current as SimEngine).snapshot(),
  );
  const [running, setRunning] = useState(true);
  const [rate, setRate] = useState(defaultArrivalRatePerTick);

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

  return (
    <div className="rounded-lg border border-[var(--color-edge)] bg-[var(--color-panel)] p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-black"
        >
          {running ? "Pause" : "Run"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded border border-[var(--color-edge)] px-3 py-1.5 text-sm text-slate-300"
        >
          Reset
        </button>
        <span className="mx-1 h-5 w-px bg-[var(--color-edge)]" />
        <button
          type="button"
          onClick={() => changeRate(rate * 0.75)}
          className="rounded border border-[var(--color-edge)] px-3 py-1.5 text-sm text-slate-300"
        >
          Traffic -
        </button>
        <button
          type="button"
          onClick={() => changeRate(rate * 1.5)}
          className="rounded border border-[var(--color-edge)] px-3 py-1.5 text-sm text-slate-300"
        >
          Traffic +
        </button>
        <button
          type="button"
          onClick={scaleBottleneck}
          className="rounded border border-[var(--color-edge)] px-3 py-1.5 text-sm text-slate-300"
        >
          Scale bottleneck
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Offered" value={`${toRps(rate).toLocaleString()} rps`} />
        <Metric label="Throughput" value={`${Math.round(state.qps).toLocaleString()} rps`} />
        <Metric label="P99 latency" value={`${Math.round(state.p99Ms)} ms`} />
        <Metric
          label="Error rate"
          value={`${(state.errorRate * 100).toFixed(1)}%`}
          alert={state.errorRate > 0.02}
        />
      </div>

      <ul className="mt-5 space-y-2">
        {state.nodes.map((node) => {
          const isBottleneck = node.id === state.bottleneckId;
          return (
            <li
              key={node.id}
              className="flex items-center gap-3 rounded border border-[var(--color-edge)] px-3 py-2"
            >
              <div className="w-40 shrink-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{node.label}</span>
                  {node.replicas > 1 && (
                    <span className="text-xs text-slate-500">x{node.replicas}</span>
                  )}
                </div>
                <div className="text-xs uppercase tracking-wide text-slate-500">{node.kind}</div>
              </div>

              <div className="h-2 flex-1 overflow-hidden rounded bg-[var(--color-ink)]">
                <div
                  className={
                    node.down
                      ? "h-full bg-red-500"
                      : isBottleneck
                        ? "h-full bg-[var(--color-accent)]"
                        : "h-full bg-emerald-500"
                  }
                  style={{ width: `${Math.min(100, Math.round(node.utilization * 100))}%` }}
                />
              </div>

              <span className="w-10 shrink-0 text-right text-xs text-slate-400">
                {node.down ? "down" : `${Math.round(node.utilization * 100)}%`}
              </span>

              <button
                type="button"
                onClick={() => toggleDown(node.id, !node.down)}
                className="w-20 shrink-0 rounded border border-[var(--color-edge)] px-2 py-1 text-xs text-slate-300"
              >
                {node.down ? "Recover" : "Break"}
              </button>
            </li>
          );
        })}
      </ul>

      {state.bottleneckId && (
        <p className="mt-3 text-xs text-slate-500">
          Bottleneck:{" "}
          <span className="text-[var(--color-accent)]">
            {state.nodes.find((n) => n.id === state.bottleneckId)?.label}
          </span>
          . Scale it or raise traffic and watch where the limit moves next.
        </p>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded border border-[var(--color-edge)] bg-[var(--color-ink)] px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={alert ? "text-lg font-semibold text-red-400" : "text-lg font-semibold"}>
        {value}
      </div>
    </div>
  );
}
