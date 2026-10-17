import type { Db } from "@/db";
import { challengeRuns, quizAttempts, users } from "@/db/schema";
import { and, count, countDistinct, desc, eq, gte, ilike, max, or, sql } from "drizzle-orm";
import type { GradedRun } from "./grade";

export async function insertChallengeRun(db: Db, userId: string, run: GradedRun): Promise<void> {
  await db.insert(challengeRuns).values({
    userId,
    challengeSlug: run.slug,
    passed: run.passed,
    p99Ms: run.p99Ms,
    errorRate: run.errorRate,
    throughputRps: run.throughputRps,
    nodeCount: run.nodeCount,
  });
}

export async function insertQuizAttempt(
  db: Db,
  userId: string,
  attempt: { slug: string; score: number; total: number },
): Promise<void> {
  await db
    .insert(quizAttempts)
    .values({ userId, quizSlug: attempt.slug, score: attempt.score, total: attempt.total });
}

/** One row per person, with their activity totals, for the admin table. */
export async function listUsersWithStats(db: Db, search?: string) {
  const runStats = db
    .select({
      userId: challengeRuns.userId,
      runs: count().as("runs"),
      solved: countDistinct(
        sql`case when ${challengeRuns.passed} then ${challengeRuns.challengeSlug} end`,
      ).as("solved"),
      lastRunAt: max(challengeRuns.createdAt).as("last_run_at"),
    })
    .from(challengeRuns)
    .groupBy(challengeRuns.userId)
    .as("run_stats");

  const quizStats = db
    .select({
      userId: quizAttempts.userId,
      attempts: count().as("attempts"),
      bestPct: max(
        sql<number>`round(100.0 * ${quizAttempts.score} / nullif(${quizAttempts.total}, 0))`,
      ).as("best_pct"),
    })
    .from(quizAttempts)
    .groupBy(quizAttempts.userId)
    .as("quiz_stats");

  const q = search?.trim();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      createdAt: users.createdAt,
      lastSeenAt: users.lastSeenAt,
      runs: sql<number>`coalesce(${runStats.runs}, 0)`.mapWith(Number),
      solved: sql<number>`coalesce(${runStats.solved}, 0)`.mapWith(Number),
      quizAttempts: sql<number>`coalesce(${quizStats.attempts}, 0)`.mapWith(Number),
      bestQuizPct: sql<number | null>`${quizStats.bestPct}`.mapWith((v) =>
        v === null ? null : Number(v),
      ),
    })
    .from(users)
    .leftJoin(runStats, eq(runStats.userId, users.id))
    .leftJoin(quizStats, eq(quizStats.userId, users.id))
    .where(q ? or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)) : undefined)
    .orderBy(sql`${users.lastSeenAt} desc nulls last`, desc(users.createdAt));
  return rows;
}

/** Headline numbers for the admin page. */
export async function adminOverview(db: Db, now: Date = new Date()) {
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [[people], [active], [runs], [solves]] = await Promise.all([
    db.select({ n: count() }).from(users),
    db.select({ n: count() }).from(users).where(gte(users.lastSeenAt, weekAgo)),
    db.select({ n: count() }).from(challengeRuns).where(gte(challengeRuns.createdAt, weekAgo)),
    db
      .select({ n: count() })
      .from(challengeRuns)
      .where(and(eq(challengeRuns.passed, true), gte(challengeRuns.createdAt, weekAgo))),
  ]);
  return {
    people: people?.n ?? 0,
    activeThisWeek: active?.n ?? 0,
    runsThisWeek: runs?.n ?? 0,
    passesThisWeek: solves?.n ?? 0,
  };
}

/** Everything about one person: their row, per-challenge summary, and recent activity. */
export async function userProgress(db: Db, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;

  const [perChallenge, recentRuns, quizzes] = await Promise.all([
    db
      .select({
        slug: challengeRuns.challengeSlug,
        runs: count(),
        passes: sql<number>`count(*) filter (where ${challengeRuns.passed})`.mapWith(Number),
        bestP99Ms: sql<
          number | null
        >`min(${challengeRuns.p99Ms}) filter (where ${challengeRuns.passed})`.mapWith((v) =>
          v === null ? null : Number(v),
        ),
        lastRunAt: max(challengeRuns.createdAt),
      })
      .from(challengeRuns)
      .where(eq(challengeRuns.userId, userId))
      .groupBy(challengeRuns.challengeSlug),
    db
      .select()
      .from(challengeRuns)
      .where(eq(challengeRuns.userId, userId))
      .orderBy(desc(challengeRuns.createdAt))
      .limit(25),
    db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, userId))
      .orderBy(desc(quizAttempts.createdAt))
      .limit(25),
  ]);

  return { user, perChallenge, recentRuns, quizzes };
}
