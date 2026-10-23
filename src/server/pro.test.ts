import { users } from "@/db/schema";
import { addUser, testDb } from "@/test/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { hasPro, setProAccess } from "./pro";

const NOW = new Date("2026-10-23T12:00:00Z");
const DAY = 86_400_000;

describe("who has Pro", () => {
  it("admins always; everyone else while their access runs", () => {
    expect(hasPro({ role: "admin" }, NOW)).toBe(true);
    expect(hasPro({ role: "client", proUntil: new Date(NOW.getTime() + DAY) }, NOW)).toBe(true);
    expect(hasPro({ role: "client", proUntil: new Date(NOW.getTime() - 1) }, NOW)).toBe(false);
    expect(hasPro({ role: "client", proUntil: null }, NOW)).toBe(false);
    expect(hasPro({}, NOW)).toBe(false);
  });
});

describe("granting Pro", () => {
  const proUntilOf = async (db: Awaited<ReturnType<typeof testDb>>, id: string) =>
    (await db.select().from(users).where(eq(users.id, id)))[0];

  it("only admins can grant it", async () => {
    const db = await testDb();
    const client = await addUser(db);
    const other = await addUser(db);
    expect(await setProAccess(db, client, other, 30, NOW)).toEqual({
      ok: false,
      reason: "not-admin",
    });
    expect((await proUntilOf(db, other))?.proUntil).toBeNull();
  });

  it("grants add up from the end of current access, and can be taken away", async () => {
    const db = await testDb();
    const admin = await addUser(db, { role: "admin" });
    const tester = await addUser(db);

    const first = await setProAccess(db, admin, tester, 30, NOW);
    expect(first).toEqual({ ok: true, proUntil: new Date(NOW.getTime() + 30 * DAY) });
    const row = await proUntilOf(db, tester);
    expect(row?.proSource).toBe("admin");
    expect(hasPro({ role: row?.role, proUntil: row?.proUntil }, NOW)).toBe(true);

    const second = await setProAccess(db, admin, tester, 365, NOW);
    expect(second).toEqual({ ok: true, proUntil: new Date(NOW.getTime() + 395 * DAY) });

    expect(await setProAccess(db, admin, tester, 0, NOW)).toEqual({ ok: true, proUntil: null });
    const after = await proUntilOf(db, tester);
    expect(after?.proUntil).toBeNull();
    expect(after?.proSource).toBeNull();
  });

  it("starts a new grant from now once old access has lapsed", async () => {
    const db = await testDb();
    const admin = await addUser(db, { role: "admin" });
    const tester = await addUser(db, { proUntil: new Date(NOW.getTime() - 10 * DAY) });
    expect(await setProAccess(db, admin, tester, 30, NOW)).toEqual({
      ok: true,
      proUntil: new Date(NOW.getTime() + 30 * DAY),
    });
    expect(await setProAccess(db, admin, "nobody", 30, NOW)).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});
