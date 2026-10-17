import type { Db } from "@/db";
import { type Role, users } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";
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

  if (target.role === "admin" && role === "client") {
    const [row] = await db.select({ admins: count() }).from(users).where(eq(users.role, "admin"));
    if ((row?.admins ?? 0) <= 1) return { ok: false, reason: "last-admin" };
  }

  await db.update(users).set({ role }).where(eq(users.id, targetId));
  return { ok: true };
}
