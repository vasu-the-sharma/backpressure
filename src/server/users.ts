import type { Db } from "@/db";
import {
  type Role,
  accounts,
  challengeRuns,
  dailyResults,
  quizAttempts,
  users,
  waitlist,
} from "@/db/schema";
import { and, asc, count, eq, or } from "drizzle-orm";
import { adminEmails } from "./config";

/** How stale `last_seen_at` may get before a request refreshes it (avoids a write per request). */
export const LAST_SEEN_INTERVAL_MS = 10 * 60 * 1000;

export async function touchLastSeen(
  db: Db,
  userId: string,
  lastSeenAt: Date | null,
  now: Date = new Date(),
): Promise<boolean> {
  if (lastSeenAt && now.getTime() - lastSeenAt.getTime() < LAST_SEEN_INTERVAL_MS) return false;
  await db.update(users).set({ lastSeenAt: now }).where(eq(users.id, userId));
  return true;
}

/** Make a user an admin if their email is listed in ADMIN_EMAILS. Never demotes. */
export async function promoteListedAdmin(
  db: Db,
  userId: string,
  email: string | null,
  listed: Set<string> = adminEmails(),
): Promise<boolean> {
  if (!email || !listed.has(email.toLowerCase())) return false;
  await db
    .update(users)
    .set({ role: "admin" })
    .where(and(eq(users.id, userId), eq(users.role, "client")));
  return true;
}

export type RoleChange =
  | { ok: true }
  | { ok: false; reason: "not-found" | "last-admin" | "not-admin" };

/**
 * Change someone's role, as `actorId`. Only admins may do it, and the last
 * admin can't be demoted — that would lock everyone out of the admin pages.
 */
export async function setRole(
  db: Db,
  actorId: string,
  targetId: string,
  role: Role,
): Promise<RoleChange> {
  const [actor] = await db.select({ role: users.role }).from(users).where(eq(users.id, actorId));
  if (actor?.role !== "admin") return { ok: false, reason: "not-admin" };

  const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, targetId));
  if (!target) return { ok: false, reason: "not-found" };
  if (target.role === role) return { ok: true };

  if (role === "client" && (await isLastAdmin(db, target.role))) {
    return { ok: false, reason: "last-admin" };
  }

  await db.update(users).set({ role }).where(eq(users.id, targetId));
  return { ok: true };
}

async function isLastAdmin(db: Db, role: Role): Promise<boolean> {
  if (role !== "admin") return false;
  const [row] = await db.select({ admins: count() }).from(users).where(eq(users.role, "admin"));
  return (row?.admins ?? 0) <= 1;
}

/** A person's waitlist entries: joined while signed in, or with the same email signed out. */
function waitlistOf(userId: string, email: string | null) {
  return email
    ? or(eq(waitlist.userId, userId), eq(waitlist.email, email.trim().toLowerCase()))
    : eq(waitlist.userId, userId);
}

export type AccountDeletion = { ok: true } | { ok: false; reason: "not-found" | "last-admin" };

/**
 * Delete a person and everything linked to them. Their Google sign-in,
 * sessions, Playground runs, quiz scores and daily results go with the user
 * row; their waitlist entries are removed by account and by email. The last
 * admin can't delete themselves, for the same reason they can't step down.
 */
export async function deleteAccount(db: Db, userId: string): Promise<AccountDeletion> {
  const [user] = await db
    .select({ role: users.role, email: users.email })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) return { ok: false, reason: "not-found" };
  if (await isLastAdmin(db, user.role)) return { ok: false, reason: "last-admin" };

  await db.delete(waitlist).where(waitlistOf(userId, user.email));
  await db.delete(users).where(eq(users.id, userId));
  return { ok: true };
}

/**
 * Everything stored about a person, for them to download. Google's sign-in
 * tokens are security credentials, so only the provider's name is included.
 */
export async function exportAccount(db: Db, userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      createdAt: users.createdAt,
      lastSeenAt: users.lastSeenAt,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) return null;

  const [signIns, playgroundRuns, quizzes, daily, waitlistRows] = await Promise.all([
    db.select({ provider: accounts.provider }).from(accounts).where(eq(accounts.userId, userId)),
    db
      .select({
        challenge: challengeRuns.challengeSlug,
        passed: challengeRuns.passed,
        p99Ms: challengeRuns.p99Ms,
        errorRate: challengeRuns.errorRate,
        throughputRps: challengeRuns.throughputRps,
        components: challengeRuns.nodeCount,
        at: challengeRuns.createdAt,
      })
      .from(challengeRuns)
      .where(eq(challengeRuns.userId, userId))
      .orderBy(asc(challengeRuns.createdAt)),
    db
      .select({
        quiz: quizAttempts.quizSlug,
        score: quizAttempts.score,
        total: quizAttempts.total,
        at: quizAttempts.createdAt,
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, userId))
      .orderBy(asc(quizAttempts.createdAt)),
    db
      .select({
        day: dailyResults.day,
        servers: dailyResults.servers,
        p99Ms: dailyResults.p99Ms,
        errorRate: dailyResults.errorRate,
        solvedAt: dailyResults.solvedAt,
      })
      .from(dailyResults)
      .where(eq(dailyResults.userId, userId))
      .orderBy(asc(dailyResults.day)),
    db
      .select({
        email: waitlist.email,
        plan: waitlist.plan,
        source: waitlist.source,
        priceVariant: waitlist.priceVariant,
        priceCents: waitlist.priceCents,
        period: waitlist.period,
        priceTestArm: waitlist.arm,
        priceTestRegion: waitlist.segment,
        priceTestVisitorId: waitlist.visitorId,
        joinedAt: waitlist.createdAt,
      })
      .from(waitlist)
      .where(waitlistOf(userId, user.email))
      .orderBy(asc(waitlist.createdAt)),
  ]);

  return {
    exportedAt: new Date(),
    account: { ...user, signIns: signIns.map((s) => s.provider) },
    playgroundRuns,
    quizAttempts: quizzes,
    dailyResults: daily,
    waitlist: waitlistRows,
  };
}
