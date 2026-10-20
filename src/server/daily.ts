import { buildDesignGraph, validateChallengeDesign } from "@/content/challenges/build";
import { getDailyPuzzle, serversIn } from "@/content/daily/generate";
import { streakFrom } from "@/content/daily/streak";
import type { Db } from "@/db";
import { dailyResults, users, waitlist } from "@/db/schema";
import { scoreDesign } from "@/sim/score";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { designInput } from "./grade";

/**
 * The daily puzzle on the server: re-grade what the canvas built, keep each
 * player's best result, and read the leaderboard, streaks and waitlist.
 */

export const dailyRunInput = z.object({
  day: z.number().int().min(1).max(100_000),
  design: designInput,
});
export type DailyRunInput = z.infer<typeof dailyRunInput>;

export interface GradedDaily {
  day: number;
  passed: boolean;
  servers: number;
  p99Ms: number;
  errorRate: number;
}

export function gradeDailyRun(
  input: DailyRunInput,
): { ok: true; run: GradedDaily } | { ok: false; error: string } {
  const { challenge } = getDailyPuzzle(input.day);
  const allowed = new Set(challenge.palette);
  if (input.design.nodes.some((n) => !allowed.has(n.kind))) {
    return { ok: false, error: "Design uses a component this puzzle doesn't offer." };
  }
  const graph = buildDesignGraph(challenge, input.design);
  const problems = validateChallengeDesign(challenge, graph);
  if (problems.length > 0) return { ok: false, error: problems[0] ?? "Invalid design." };
  const result = scoreDesign(graph, challenge.load, challenge.slo);
  return {
    ok: true,
    run: {
      day: input.day,
      passed: result.pass,
      servers: serversIn(input.design),
      p99Ms: Math.round(result.state.p99Ms),
      errorRate: result.state.errorRate,
    },
  };
}

/**
 * Keep a passing run if it beats the player's best for the day (fewer
 * servers, or as many with a lower P99). A single upsert, so it needs no
 * transaction (Neon's HTTP driver has none).
 */
export async function recordDailyResult(
  db: Db,
  userId: string,
  run: GradedDaily,
  now: Date = new Date(),
): Promise<{ improved: boolean }> {
  if (!run.passed) return { improved: false };
  const rows = await db
    .insert(dailyResults)
    .values({
      day: run.day,
      userId,
      servers: run.servers,
      p99Ms: run.p99Ms,
      errorRate: run.errorRate,
      solvedAt: now,
    })
    .onConflictDoUpdate({
      target: [dailyResults.day, dailyResults.userId],
      set: {
        servers: sql`excluded.servers`,
        p99Ms: sql`excluded.p99_ms`,
        errorRate: sql`excluded.error_rate`,
        solvedAt: sql`excluded.solved_at`,
      },
      setWhere: sql`excluded.servers < ${dailyResults.servers} or (excluded.servers = ${dailyResults.servers} and excluded.p99_ms < ${dailyResults.p99Ms})`,
    })
    .returning({ day: dailyResults.day });
  return { improved: rows.length > 0 };
}

/** "Vasu S.": enough to recognise yourself, not enough to identify a stranger. */
export function publicName(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Anonymous";
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  return last ? `${first} ${last[0]?.toUpperCase()}.` : first;
}

export interface Standing {
  rank: number;
  name: string;
  servers: number;
  p99Ms: number;
  isYou: boolean;
}

export interface DailyStandings {
  solvers: number;
  /** How many solvers used each server count, fewest first. */
  distribution: Array<{ servers: number; players: number }>;
  top: Standing[];
  /** The signed-in player's row, when they've solved it. */
  you: Standing | null;
}

export async function dailyStandings(
  db: Db,
  day: number,
  userId?: string | null,
  limit = 10,
): Promise<DailyStandings> {
  const [distribution, topRows, mine] = await Promise.all([
    db
      .select({ servers: dailyResults.servers, players: count() })
      .from(dailyResults)
      .where(eq(dailyResults.day, day))
      .groupBy(dailyResults.servers)
      .orderBy(asc(dailyResults.servers)),
    db
      .select({
        userId: dailyResults.userId,
        name: users.name,
        servers: dailyResults.servers,
        p99Ms: dailyResults.p99Ms,
      })
      .from(dailyResults)
      .innerJoin(users, eq(users.id, dailyResults.userId))
      .where(eq(dailyResults.day, day))
      .orderBy(asc(dailyResults.servers), asc(dailyResults.p99Ms), asc(dailyResults.solvedAt))
      .limit(limit),
    userId
      ? db
          .select()
          .from(dailyResults)
          .where(and(eq(dailyResults.day, day), eq(dailyResults.userId, userId)))
      : Promise.resolve([]),
  ]);

  const top = topRows.map((r, i) => ({
    rank: i + 1,
    name: publicName(r.name),
    servers: r.servers,
    p99Ms: r.p99Ms,
    isYou: r.userId === userId,
  }));

  let you: Standing | null = null;
  const row = mine[0];
  if (row && userId) {
    const [ahead] = await db
      .select({ n: count() })
      .from(dailyResults)
      .where(
        and(
          eq(dailyResults.day, day),
          sql`(${dailyResults.servers}, ${dailyResults.p99Ms}, ${dailyResults.solvedAt}) < (${row.servers}, ${row.p99Ms}, ${row.solvedAt})`,
        ),
      );
    you = {
      rank: (ahead?.n ?? 0) + 1,
      name: "You",
      servers: row.servers,
      p99Ms: row.p99Ms,
      isYou: true,
    };
  }

  return {
    solvers: distribution.reduce((n, d) => n + d.players, 0),
    distribution: distribution.map((d) => ({ servers: d.servers, players: Number(d.players) })),
    top,
    you,
  };
}

export async function dailyStreak(db: Db, userId: string, today: number) {
  const rows = await db
    .select({ day: dailyResults.day })
    .from(dailyResults)
    .where(eq(dailyResults.userId, userId))
    .orderBy(desc(dailyResults.day))
    .limit(400);
  return streakFrom(
    rows.map((r) => r.day),
    today,
  );
}

/** Solver counts for a range of days (the archive). */
export async function solversByDay(db: Db, fromDay: number, toDay: number) {
  const rows = await db
    .select({ day: dailyResults.day, players: count() })
    .from(dailyResults)
    .where(sql`${dailyResults.day} between ${fromDay} and ${toDay}`)
    .groupBy(dailyResults.day);
  return new Map(rows.map((r) => [r.day, Number(r.players)]));
}

export interface WaitlistEntry {
  email: string;
  userId?: string | null;
  plan: string;
  source: string;
  priceVariant?: string | null;
  priceCents?: number | null;
  arm?: string | null;
  segment?: string | null;
  period?: string | null;
  visitorId?: string | null;
}

/** Add someone to a plan's waitlist once; joining again is a no-op. */
export async function addToWaitlist(db: Db, entry: WaitlistEntry): Promise<{ added: boolean }> {
  const rows = await db
    .insert(waitlist)
    .values({ ...entry, email: entry.email.trim().toLowerCase() })
    .onConflictDoNothing({ target: [waitlist.email, waitlist.plan] })
    .returning({ id: waitlist.id });
  return { added: rows.length > 0 };
}

/** Headline numbers for the admin page: today's daily and the waitlist. */
export async function dailyAdminStats(db: Db, today: number) {
  const [[solvedToday], [waiting], recent] = await Promise.all([
    db.select({ n: count() }).from(dailyResults).where(eq(dailyResults.day, today)),
    db.select({ n: count() }).from(waitlist),
    db
      .select({
        email: waitlist.email,
        plan: waitlist.plan,
        source: waitlist.source,
        priceVariant: waitlist.priceVariant,
        createdAt: waitlist.createdAt,
      })
      .from(waitlist)
      .orderBy(desc(waitlist.createdAt))
      .limit(20),
  ]);
  return { solvedToday: solvedToday?.n ?? 0, waitlist: waiting?.n ?? 0, recent };
}
