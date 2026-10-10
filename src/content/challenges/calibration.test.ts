import { scoreDesign } from "@/sim/score";
import { describe, expect, it } from "vitest";
import { buildDesignGraph, validateChallengeDesign } from "./build";
import { getAllChallenges } from "./registry";

/**
 * Every challenge is a lesson encoded as two designs: the obvious one fails,
 * the reference passes. If an engine or content change breaks either side, the
 * challenge no longer teaches what its write-up says — fail loudly here.
 */
describe.each(getAllChallenges().map((c) => [c.slug, c] as const))("%s", (_slug, challenge) => {
  it("reference design is valid and meets the SLO", () => {
    const graph = buildDesignGraph(challenge, challenge.calibration.reference);
    expect(validateChallengeDesign(challenge, graph)).toEqual([]);
    const result = scoreDesign(graph, challenge.load, challenge.slo);
    expect(result.checks.filter((c) => !c.ok)).toEqual([]);
  });

  it("naive design is valid but misses the SLO", () => {
    const graph = buildDesignGraph(challenge, challenge.calibration.naive);
    expect(validateChallengeDesign(challenge, graph)).toEqual([]);
    expect(scoreDesign(graph, challenge.load, challenge.slo).pass).toBe(false);
  });

  it("only uses kinds from its palette", () => {
    const allowed = new Set(challenge.palette);
    for (const d of [challenge.calibration.naive, challenge.calibration.reference]) {
      for (const n of d.nodes) expect(allowed.has(n.kind)).toBe(true);
    }
  });
});
