import { getDailyPuzzle } from "@/content/daily/generate";
import { streakFrom } from "@/content/daily/streak";
import { addUser, testDb } from "@/test/db";
import { describe, expect, it } from "vitest";
import {
  addToWaitlist,
  dailyAdminStats,
  dailyStandings,
  dailyStreak,
  gradeDailyRun,
  publicName,
  recordDailyResult,
} from "./daily";

const DAY = 2;
const puzzle = getDailyPuzzle(DAY);
const pass = (servers: number, p99Ms: number) => ({
  day: DAY,
  passed: true,
  servers,
  p99Ms,
  errorRate: 0,
});

describe("daily grading", () => {
  it("scores the par design as a pass with par servers, and the naive one as a fail", () => {
    const ref = gradeDailyRun({ day: DAY, design: puzzle.challenge.calibration.reference });
    const naive = gradeDailyRun({ day: DAY, design: puzzle.challenge.calibration.naive });
    expect(ref.ok && ref.run.passed && ref.run.servers).toBe(puzzle.par);
    expect(naive.ok && naive.run.passed).toBe(false);
  });

  it("rejects components the puzzle doesn't offer and unconnected designs", () => {
    const foreign = gradeDailyRun({
      day: DAY,
      design: { nodes: [{ id: "x", kind: "client" }], edges: [] },
    });
    expect(foreign.ok).toBe(false);
    expect(gradeDailyRun({ day: DAY, design: { nodes: [], edges: [] } }).ok).toBe(false);
  });
});

describe("daily results", () => {
  it("keeps each player's best: fewer servers, then lower P99", async () => {
    const db = await testDb();
    const u = await addUser(db, { name: "Ada Lovelace" });
    expect((await recordDailyResult(db, u, pass(6, 400))).improved).toBe(true);
    expect((await recordDailyResult(db, u, pass(7, 100))).improved).toBe(false);
    expect((await recordDailyResult(db, u, pass(6, 300))).improved).toBe(true);
    expect((await recordDailyResult(db, u, { ...pass(2, 1), passed: false })).improved).toBe(false);
    const s = await dailyStandings(db, DAY, u);
    expect(s.you).toMatchObject({ rank: 1, servers: 6, p99Ms: 300 });
  });

  it("ranks by servers, then P99, then who got there first", async () => {
    const db = await testDb();
    const a = await addUser(db, { name: "Ada Lovelace" });
    const b = await addUser(db, { name: "Grace Hopper" });
    const c = await addUser(db, { name: "Linus" });
    const d = await addUser(db, { name: null });
    await recordDailyResult(db, a, pass(5, 400), new Date("2026-10-20T01:00:00Z"));
    await recordDailyResult(db, b, pass(5, 300), new Date("2026-10-20T02:00:00Z"));
    await recordDailyResult(db, c, pass(4, 900), new Date("2026-10-20T03:00:00Z"));
    await recordDailyResult(db, d, pass(5, 400), new Date("2026-10-20T04:00:00Z"));

    const s = await dailyStandings(db, DAY, a);
    expect(s.top.map((r) => r.name)).toEqual(["Linus", "Grace H.", "Ada L.", "Anonymous"]);
    expect(s.top[2]?.isYou).toBe(true);
    expect(s.you?.rank).toBe(3);
    expect(s.solvers).toBe(4);
    expect(s.distribution).toEqual([
      { servers: 4, players: 1 },
      { servers: 5, players: 3 },
    ]);
    expect((await dailyStandings(db, DAY + 1, a)).solvers).toBe(0);
  });

  it("counts streaks that survive until the end of today", async () => {
    expect(streakFrom([10, 9, 8], 10)).toEqual({ current: 3, best: 3 });
    expect(streakFrom([9, 8], 10)).toEqual({ current: 2, best: 2 });
    expect(streakFrom([8, 7], 10)).toEqual({ current: 0, best: 2 });
    expect(streakFrom([10, 8, 7, 6, 3], 10)).toEqual({ current: 1, best: 3 });
    expect(streakFrom([], 10)).toEqual({ current: 0, best: 0 });

    const db = await testDb();
    const u = await addUser(db);
    for (const day of [1, 2, 3]) await recordDailyResult(db, u, { ...pass(5, 300), day });
    expect(await dailyStreak(db, u, 4)).toEqual({ current: 3, best: 3 });
  });
});

describe("waitlist", () => {
  it("adds an email once per plan, case-insensitively", async () => {
    const db = await testDb();
    expect(
      (await addToWaitlist(db, { email: "Ada@Example.com", plan: "pro", source: "daily-archive" }))
        .added,
    ).toBe(true);
    expect(
      (await addToWaitlist(db, { email: "ada@example.com", plan: "pro", source: "pricing" })).added,
    ).toBe(false);
    expect(
      (await addToWaitlist(db, { email: "ada@example.com", plan: "teams", source: "pricing" }))
        .added,
    ).toBe(true);
    const stats = await dailyAdminStats(db, DAY);
    expect(stats.waitlist).toBe(2);
    expect(stats.recent[0]?.email).toBe("ada@example.com");
  });
});

describe("public names", () => {
  it("show a first name and last initial, never more", () => {
    expect(publicName("Ada King Lovelace")).toBe("Ada L.");
    expect(publicName("Linus")).toBe("Linus");
    expect(publicName("  ")).toBe("Anonymous");
    expect(publicName(null)).toBe("Anonymous");
  });
});
