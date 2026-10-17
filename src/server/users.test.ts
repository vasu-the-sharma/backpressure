import { users } from "@/db/schema";
import { addUser, testDb } from "@/test/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { LAST_SEEN_INTERVAL_MS, promoteListedAdmin, setRole, touchLastSeen } from "./users";

const roleOf = async (db: Awaited<ReturnType<typeof testDb>>, id: string) =>
  (await db.select({ role: users.role }).from(users).where(eq(users.id, id)))[0]?.role;

describe("roles", () => {
  it("new users are clients", async () => {
    const db = await testDb();
    expect(await roleOf(db, await addUser(db))).toBe("client");
  });

  it("promotes only emails listed in ADMIN_EMAILS, case-insensitively", async () => {
    const db = await testDb();
    const listed = new Set(["owner@example.com"]);
    const a = await addUser(db, { email: "Owner@Example.com" });
    const b = await addUser(db, { email: "someone@example.com" });
    expect(await promoteListedAdmin(db, a, "Owner@Example.com", listed)).toBe(true);
    expect(await promoteListedAdmin(db, b, "someone@example.com", listed)).toBe(false);
    expect(await roleOf(db, a)).toBe("admin");
    expect(await roleOf(db, b)).toBe("client");
  });

  it("only admins can change roles", async () => {
    const db = await testDb();
    const client = await addUser(db);
    const other = await addUser(db);
    expect(await setRole(db, client, other, "admin")).toEqual({ ok: false, reason: "not-admin" });
    expect(await roleOf(db, other)).toBe("client");
  });

  it("an admin can promote and demote, but never the last admin", async () => {
    const db = await testDb();
    const admin = await addUser(db, { role: "admin" });
    const other = await addUser(db);
    expect(await setRole(db, admin, admin, "client")).toEqual({ ok: false, reason: "last-admin" });
    expect(await setRole(db, admin, other, "admin")).toEqual({ ok: true });
    expect(await setRole(db, other, admin, "client")).toEqual({ ok: true });
    expect(await roleOf(db, admin)).toBe("client");
    expect(await setRole(db, other, "missing", "admin")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});

describe("last seen", () => {
  it("writes at most once per interval", async () => {
    const db = await testDb();
    const id = await addUser(db);
    const t0 = new Date("2026-10-17T10:00:00Z");
    expect(await touchLastSeen(db, id, null, t0)).toBe(true);
    const soon = new Date(t0.getTime() + LAST_SEEN_INTERVAL_MS - 1);
    expect(await touchLastSeen(db, id, t0, soon)).toBe(false);
    const later = new Date(t0.getTime() + LAST_SEEN_INTERVAL_MS);
    expect(await touchLastSeen(db, id, t0, later)).toBe(true);
  });
});
