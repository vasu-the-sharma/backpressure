import { getChallenge } from "@/content/challenges/registry";
import { getQuiz } from "@/content/quizzes/registry";
import { addUser, testDb } from "@/test/db";
import { describe, expect, it } from "vitest";
import { gradeChallengeRun, gradeQuizAttempt } from "./grade";
import {
  adminOverview,
  insertChallengeRun,
  insertQuizAttempt,
  listUsersWithStats,
  userProgress,
} from "./progress";

const challenge = getChallenge("url-shortener-reads");
const quiz = getQuiz("system-design-instincts");
if (!challenge || !quiz) throw new Error("fixtures missing");

describe("server grading", () => {
  it("passes the reference design and fails the naive one, like the canvas", () => {
    const ref = gradeChallengeRun({
      slug: challenge.slug,
      design: challenge.calibration.reference,
    });
    const naive = gradeChallengeRun({ slug: challenge.slug, design: challenge.calibration.naive });
    expect(ref.ok && ref.run.passed).toBe(true);
    expect(naive.ok && naive.run.passed).toBe(false);
  });

  it("rejects unknown challenges, foreign components, and invalid designs", () => {
    expect(gradeChallengeRun({ slug: "nope", design: { nodes: [], edges: [] } }).ok).toBe(false);
    const foreign = gradeChallengeRun({
      slug: challenge.slug,
      design: { nodes: [{ id: "x", kind: "storage" }], edges: [["client", "x"]] },
    });
    expect(foreign.ok).toBe(false);
    expect(gradeChallengeRun({ slug: challenge.slug, design: { nodes: [], edges: [] } }).ok).toBe(
      false,
    );
  });

  it("grades a quiz from the answers, not a claimed score", () => {
    const all = Object.fromEntries(quiz.questions.map((q) => [q.id, q.correct]));
    const none = Object.fromEntries(quiz.questions.map((q) => [q.id, ["zzz"]]));
    expect(gradeQuizAttempt({ slug: quiz.slug, answers: all })).toMatchObject({
      ok: true,
      score: quiz.questions.length,
    });
    expect(gradeQuizAttempt({ slug: quiz.slug, answers: none })).toMatchObject({
      ok: true,
      score: 0,
    });
  });
});

describe("progress queries", () => {
  it("aggregates runs, solves and quiz bests per person", async () => {
    const db = await testDb();
    const active = await addUser(db, { name: "Ada", lastSeenAt: new Date() });
    const idle = await addUser(db, { name: "Bob" });

    const ref = gradeChallengeRun({
      slug: challenge.slug,
      design: challenge.calibration.reference,
    });
    const naive = gradeChallengeRun({ slug: challenge.slug, design: challenge.calibration.naive });
    if (!ref.ok || !naive.ok) throw new Error("grading failed");
    await insertChallengeRun(db, active, naive.run);
    await insertChallengeRun(db, active, ref.run);
    await insertChallengeRun(db, active, ref.run);
    await insertQuizAttempt(db, active, { slug: quiz.slug, score: 5, total: 8 });
    await insertQuizAttempt(db, active, { slug: quiz.slug, score: 7, total: 8 });

    const rows = await listUsersWithStats(db);
    expect(rows.map((r) => r.name)).toEqual(["Ada", "Bob"]); // most recently seen first
    expect(rows[0]).toMatchObject({ runs: 3, solved: 1, quizAttempts: 2, bestQuizPct: 88 });
    expect(rows[1]).toMatchObject({ runs: 0, solved: 0, quizAttempts: 0, bestQuizPct: null });
    expect((await listUsersWithStats(db, "bo")).map((r) => r.id)).toEqual([idle]);

    const detail = await userProgress(db, active);
    expect(detail?.perChallenge).toEqual([
      expect.objectContaining({
        slug: challenge.slug,
        runs: 3,
        passes: 2,
        bestP99Ms: ref.run.p99Ms,
      }),
    ]);
    expect(detail?.recentRuns).toHaveLength(3);
    expect(await userProgress(db, "missing")).toBeNull();

    expect(await adminOverview(db)).toEqual({
      people: 2,
      activeThisWeek: 1,
      runsThisWeek: 3,
      passesThisWeek: 2,
    });
  });
});
