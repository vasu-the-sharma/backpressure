import type { Db } from "@/db";
import { type Role, users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Who has Pro. Admins always do. Everyone else has it while `proUntil` is in
 * the future: an admin's grant for now (beta testers), and later the end of
 * a paid period, set by the payment provider's webhook.
 */
export function hasPro(
  user: { role?: Role | null; proUntil?: Date | null },
  now: Date = new Date(),
): boolean {
  return (
    user.role === "admin" || (user.proUntil != null && user.proUntil.getTime() > now.getTime())
  );
}

/** The grants an admin can give from a person's page, in days. */
export const GRANT_DAYS = [30, 365] as const;

const DAY_MS = 86_400_000;

export type ProChange =
  | { ok: true; proUntil: Date | null }
  | { ok: false; reason: "not-admin" | "not-found" };

/**
 * As `actorId`, give someone Pro for `days` more (counted from the end of any
 * access they still have, so grants add up), or take it away with `days` = 0.
 */
export async function setProAccess(
  db: Db,
  actorId: string,
  targetId: string,
  days: number,
  now: Date = new Date(),
): Promise<ProChange> {
  const [actor] = await db.select({ role: users.role }).from(users).where(eq(users.id, actorId));
  if (actor?.role !== "admin") return { ok: false, reason: "not-admin" };
  const [target] = await db
    .select({ proUntil: users.proUntil })
    .from(users)
    .where(eq(users.id, targetId));
  if (!target) return { ok: false, reason: "not-found" };

  if (days <= 0) {
    await db.update(users).set({ proUntil: null, proSource: null }).where(eq(users.id, targetId));
    return { ok: true, proUntil: null };
  }
  const from = target.proUntil && target.proUntil > now ? target.proUntil : now;
  const proUntil = new Date(from.getTime() + days * DAY_MS);
  await db.update(users).set({ proUntil, proSource: "admin" }).where(eq(users.id, targetId));
  return { ok: true, proUntil };
}
