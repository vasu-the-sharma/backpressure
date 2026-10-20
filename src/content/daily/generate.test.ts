import { buildDesignGraph, validateChallengeDesign } from "@/content/challenges/build";
import type { DesignSpec } from "@/content/challenges/schema";
import { scoreDesign } from "@/sim/score";
import { describe, expect, it } from "vitest";
import { dailyIsoDate, dailyNumberAt } from "./calendar";
import { dailyCandidates, getDailyPuzzle, serversIn } from "./generate";
import { decodeShare, encodeShare, parPhrase, shareText } from "./share";

function passes(n: number, design: DesignSpec): boolean {
  const { challenge } = getDailyPuzzle(n);
  const graph = buildDesignGraph(challenge, design);
  if (validateChallengeDesign(challenge, graph).length > 0) return false;
  return scoreDesign(graph, challenge.load, challenge.slo).pass;
}

function withoutOneReplica(design: DesignSpec, id: string): DesignSpec {
  return {
    ...design,
    nodes: design.nodes.map((n) => (n.id === id ? { ...n, replicas: (n.replicas ?? 1) - 1 } : n)),
  };
}

/**
 * Par is only fair if it is real: the par design must meet the targets, the
 * obvious design must not, and par must be tight (one replica fewer anywhere
 * fails). Checked against the real engine for the first days of every
 * template; set DAILY_HORIZON to check further ahead (≈1 s per day).
 */
function checkDay(n: number) {
  const { challenge, par } = getDailyPuzzle(n);
  const reference = challenge.calibration.reference;
  expect(serversIn(reference)).toBe(par);
  expect(passes(n, reference), `#${n} par design passes`).toBe(true);
  expect(passes(n, challenge.calibration.naive), `#${n} naive design fails`).toBe(false);
  for (const c of dailyCandidates(n)) expect(passes(n, c), `#${n} candidate passes`).toBe(true);
  for (const node of reference.nodes) {
    if ((node.replicas ?? 1) > 1) {
      expect(passes(n, withoutOneReplica(reference, node.id)), `#${n} par is tight`).toBe(false);
    }
  }
}

describe("daily calendar", () => {
  it("numbers days from 19 October 2026 (UTC)", () => {
    expect(dailyNumberAt(Date.UTC(2026, 9, 19, 0, 0, 0))).toBe(1);
    expect(dailyNumberAt(Date.UTC(2026, 9, 19, 23, 59, 59))).toBe(1);
    expect(dailyNumberAt(Date.UTC(2026, 9, 20))).toBe(2);
    expect(dailyIsoDate(1)).toBe("2026-10-19");
    expect(dailyIsoDate(14)).toBe("2026-11-01");
  });
});

describe("daily puzzles", () => {
  it("are deterministic and rotate through every template every four days", () => {
    for (let cycle = 0; cycle < 10; cycle++) {
      const days = [1, 2, 3, 4].map((i) => cycle * 4 + i);
      const templates = new Set(days.map((n) => getDailyPuzzle(n).template));
      expect(templates.size).toBe(4);
    }
    expect(getDailyPuzzle(7)).toEqual(getDailyPuzzle(7));
    expect(getDailyPuzzle(7).challenge.load.seed).toBe(7);
  });

  it("rejects puzzle numbers before the first day", () => {
    expect(() => getDailyPuzzle(0)).toThrow();
  });

  it("has a real, tight par for the first eight days", () => {
    for (let n = 1; n <= 8; n++) checkDay(n);
  }, 60_000);

  const horizon = Number(process.env.DAILY_HORIZON ?? 0);
  it.runIf(horizon > 8)(
    `has a real, tight par up to day ${horizon}`,
    () => {
      for (let n = 9; n <= horizon; n++) checkDay(n);
    },
    3_600_000,
  );
});

describe("daily share codes", () => {
  const share = {
    n: 3,
    servers: 5,
    p99: 412,
    streak: 4,
    runs: [
      [false, true, false],
      [true, true, false],
      [true, true, true],
    ] as Array<[boolean, boolean, boolean]>,
  };

  it("round-trip through a short URL code", () => {
    const code = encodeShare(share);
    expect(code).toBe("3-5-412-4-rgrggrggg");
    expect(decodeShare(code)).toEqual(share);
  });

  it("refuse malformed codes", () => {
    for (const bad of [
      "",
      "3-5-412-4-",
      "3-5-412-4-gg",
      "0-5-1-1-ggg",
      "x-5-1-1-ggg",
      "3-5-1-1-ggx",
    ]) {
      expect(decodeShare(bad)).toBeNull();
    }
  });

  it("render a spoiler-free grid", () => {
    const text = shareText(share, 6, "https://example.com/daily");
    expect(text).toContain("Backpressure Daily #3");
    expect(text).toContain("5 servers, 1 under par (par 6)");
    expect(text).toContain("🟥🟩🟥\n🟩🟩🟥\n🟩🟩🟩");
    expect(text).toContain("🔥 4-day streak");
    expect(parPhrase(6, 6)).toBe("on par");
    expect(parPhrase(8, 6)).toBe("2 over par");
  });
});
