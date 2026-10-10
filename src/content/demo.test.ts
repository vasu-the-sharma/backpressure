import { describe, expect, it } from "vitest";
import { SimEngine } from "../sim/engine";
import { DEMO_GRAPH, DEMO_PERIOD_FRAMES, DEMO_TICKS_PER_FRAME, demoRateAt } from "./demo";

/**
 * The landing demo only teaches something if each load cycle actually crosses
 * the database's capacity and comes back. Pin that, so an engine change can't
 * silently turn the hero into a flat line.
 */
describe("landing demo calibration", () => {
  it("drops requests at the peak of the sweep and recovers at the trough", () => {
    const engine = new SimEngine(DEMO_GRAPH, {
      arrivalRatePerTick: demoRateAt(0),
      tickMs: 100,
      seed: 7,
    });
    const errorsAt: number[] = [];
    for (let f = 0; f < DEMO_PERIOD_FRAMES * 2; f++) {
      engine.setArrivalRatePerTick(demoRateAt(f));
      for (let i = 0; i < DEMO_TICKS_PER_FRAME; i++) engine.tick();
      errorsAt.push(engine.snapshot().errorRate);
    }
    const secondCycle = errorsAt.slice(DEMO_PERIOD_FRAMES);
    expect(Math.max(...secondCycle)).toBeGreaterThan(0.05);
    // Back near the trough (just before the cycle repeats), nothing is dropping.
    expect(secondCycle[secondCycle.length - 1]).toBe(0);
    expect(engine.snapshot().bottleneckId).toBe("db");
  });
});
