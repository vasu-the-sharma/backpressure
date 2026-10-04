import { SimEngine } from "./engine";
import type { SimState, SystemGraph } from "./types";

/**
 * Scoring harness for the playground: run a player's design under a fixed load
 * profile and judge it against an SLO. Everything here is deterministic (seeded,
 * no wall-clock), so the same design always produces the same verdict.
 */

export const TICK_MS = 100;

/** How long to run before reading steady-state metrics (warmup + measure). */
const DEFAULT_TICKS = 400;

export interface LoadProfile {
  label: string;
  /** Mean requests admitted per tick at the entry node. */
  arrivalRatePerTick: number;
  seed: number;
}

export interface SloTarget {
  /** Tail latency ceiling, in ms. Note hops are ~1 tick each (see TICK_MS). */
  p99Ms: number;
  /** Max fraction of requests dropped, 0..1. */
  maxErrorRate: number;
  /** Min completed requests per second. */
  minThroughputRps: number;
}

export interface ScoreCheck {
  label: string;
  actual: string;
  target: string;
  ok: boolean;
}

export interface ScoreResult {
  pass: boolean;
  state: SimState;
  offeredRps: number;
  throughputRps: number;
  checks: ScoreCheck[];
}

export function ratePerTickFromRps(rps: number): number {
  return Math.max(0, Math.round((rps * TICK_MS) / 1000));
}

export function rpsFromRatePerTick(ratePerTick: number): number {
  return Math.round((ratePerTick * 1000) / TICK_MS);
}

/** Run a design to steady state and return the final snapshot. */
export function runDesign(
  graph: SystemGraph,
  load: LoadProfile,
  ticks: number = DEFAULT_TICKS,
): SimState {
  const engine = new SimEngine(graph, {
    arrivalRatePerTick: load.arrivalRatePerTick,
    tickMs: TICK_MS,
    seed: load.seed,
  });
  engine.run(ticks);
  return engine.snapshot();
}

/** Run a design and grade it against the SLO. */
export function scoreDesign(
  graph: SystemGraph,
  load: LoadProfile,
  slo: SloTarget,
  ticks: number = DEFAULT_TICKS,
): ScoreResult {
  const state = runDesign(graph, load, ticks);
  const offeredRps = rpsFromRatePerTick(load.arrivalRatePerTick);
  const throughputRps = Math.round(state.qps);

  const checks: ScoreCheck[] = [
    {
      label: "P99 latency",
      actual: `${Math.round(state.p99Ms).toLocaleString()} ms`,
      target: `≤ ${slo.p99Ms.toLocaleString()} ms`,
      ok: state.p99Ms <= slo.p99Ms,
    },
    {
      label: "Error rate",
      actual: `${(state.errorRate * 100).toFixed(1)}%`,
      target: `≤ ${(slo.maxErrorRate * 100).toFixed(1)}%`,
      ok: state.errorRate <= slo.maxErrorRate,
    },
    {
      label: "Throughput",
      actual: `${throughputRps.toLocaleString()} rps`,
      target: `≥ ${slo.minThroughputRps.toLocaleString()} rps`,
      ok: state.qps >= slo.minThroughputRps,
    },
  ];

  return {
    pass: checks.every((c) => c.ok),
    state,
    offeredRps,
    throughputRps,
    checks,
  };
}
