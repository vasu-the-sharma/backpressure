import { describe, expect, it } from "vitest";
import { SimEngine } from "../sim/engine";
import type { SimState } from "../sim/types";
import {
  DB_QUEUE_MAX,
  DEMO_CYCLE_S,
  DEMO_GRAPH,
  DEMO_START_S,
  DEMO_TICKS_PER_FRAME,
  DEMO_TICK_MS,
  ratePerTick,
  risingLoadAt,
  steadyLoadAt,
} from "./demo";

/**
 * The landing comparison only teaches something if the steady side stays
 * healthy while the rising side crosses the database's capacity, drops
 * requests, and recovers. Pin that, so an engine change can't quietly turn
 * the page into two identical flat lines.
 */
const FRAME_S = (DEMO_TICKS_PER_FRAME * DEMO_TICK_MS) / 1000;

function run(
  loadAt: (t: number) => number,
  seconds: number,
  onFrame?: (t: number, s: SimState, e: SimEngine) => void,
) {
  const engine = new SimEngine(structuredClone(DEMO_GRAPH), {
    arrivalRatePerTick: ratePerTick(loadAt(0)),
    tickMs: DEMO_TICK_MS,
    seed: 7,
    windowTicks: 100,
  });
  for (let t = 0; t < seconds; t += FRAME_S) {
    engine.setArrivalRatePerTick(ratePerTick(loadAt(t)));
    for (let i = 0; i < DEMO_TICKS_PER_FRAME; i++) engine.tick();
    onFrame?.(t, engine.snapshot(), engine);
  }
  return engine;
}

const db = (s?: SimState) => s?.nodes.find((n) => n.id === "db");
const inCycle = (t: number, from: number, to: number) => {
  const c = t % DEMO_CYCLE_S;
  return c >= from && c < to;
};

describe("landing comparison calibration", () => {
  it("keeps the steady side healthy: no queue, no drops, baseline latency", () => {
    let worstP99 = 0;
    let worstErrors = 0;
    let worstUtil = 0;
    run(steadyLoadAt, DEMO_CYCLE_S * 2, (t, s) => {
      if (t < 2) return;
      worstP99 = Math.max(worstP99, s.p99Ms);
      worstErrors = Math.max(worstErrors, s.errorRate);
      worstUtil = Math.max(worstUtil, db(s)?.utilization ?? 0);
    });
    expect(worstErrors).toBe(0);
    expect(worstP99).toBeLessThan(60);
    expect(worstUtil).toBeLessThan(0.75);
  });

  it("takes the rising side from amber at the start to dropping at the peak, then back", () => {
    const at: { start?: SimState; end?: SimState } = {};
    let peakErrors = 0;
    run(risingLoadAt, DEMO_CYCLE_S * 2, (t, s) => {
      if (t < DEMO_CYCLE_S) return; // second cycle: no cold start
      const c = t - DEMO_CYCLE_S;
      if (Math.abs(c - DEMO_START_S) < FRAME_S / 2) at.start = s;
      if (inCycle(t, 28, 32)) peakErrors = Math.max(peakErrors, s.errorRate);
      if (Math.abs(c - (DEMO_CYCLE_S - 0.5)) < FRAME_S / 2) at.end = s;
    });
    // Opens amber: busy, but nothing queued or dropped yet.
    expect(db(at.start)?.utilization).toBeGreaterThanOrEqual(0.75);
    expect(db(at.start)?.utilization).toBeLessThan(0.98);
    expect(at.start?.errorRate).toBe(0);
    // Breaks at the peak.
    expect(peakErrors).toBeGreaterThan(0.05);
    // Fully recovered before the next rise.
    expect(at.end?.errorRate).toBe(0);
    expect(db(at.end)?.queueDepth).toBe(0);
    expect(at.end?.p99Ms).toBeLessThan(60);
    expect(at.end?.bottleneckId).toBe("db");
  });

  it("recovers within a few seconds when the database is scaled mid-break", () => {
    let scaledAt = -1;
    let recoveredAt = -1;
    run(risingLoadAt, DEMO_CYCLE_S + 32, (t, s, engine) => {
      const c = t - DEMO_CYCLE_S;
      if (scaledAt < 0 && c >= 29 && s.errorRate > 0.05) {
        engine.setReplicas("db", 2);
        scaledAt = c;
      } else if (scaledAt >= 0 && recoveredAt < 0) {
        if (s.errorRate === 0 && (db(s)?.queueDepth ?? DB_QUEUE_MAX) === 0) recoveredAt = c;
      }
    });
    expect(scaledAt).toBeGreaterThan(0);
    expect(recoveredAt - scaledAt).toBeLessThan(3);
  });
});
