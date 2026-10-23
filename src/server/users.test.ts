import { accounts, challengeRuns, dailyResults, quizAttempts, users, waitlist } from "@/db/schema";
import { addUser, testDb } from "@/test/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  LAST_SEEN_INTERVAL_MS,
  deleteAccount,
  exportAccount,
  promoteListedAdmin,
  setRole,
  touchLastSeen,
} from "./users";

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

describe("account data", () => {
  async function withHistory(db: Awaited<ReturnType<typeof testDb>>, role: "client" | "admin") {
    const id = await addUser(db, { email: `${role}@example.com`, name: "Ada Lovelace", role });
    await db.insert(accounts).values({
      userId: id,
      type: "oidc",
      provider: "google",
      providerAccountId: `g-${id}`,
      access_token: "secret-access",
      refresh_token: "secret-refresh",
      id_token: "secret-id",
    });
    await db.insert(challengeRuns).values({
      userId: id,
      challengeSlug: "url-shortener-reads",
      passed: true,
      p99Ms: 180,
      errorRate: 0,
      throughputRps: 900,
      nodeCount: 4,
    });
    await db.insert(quizAttempts).values({ userId: id, quizSlug: "basics", score: 7, total: 8 });
    await db
      .insert(dailyResults)
      .values({ day: 1, userId: id, servers: 5, p99Ms: 200, errorRate: 0 });
    await db.insert(waitlist).values([
      { email: `${role}@example.com`, userId: id, plan: "pro", source: "pricing" },
      // Joined signed out with the same address, before having an account.
      { email: `${role}@example.com`, plan: "teams", source: "pricing" },
      { email: "someone-else@example.com", plan: "pro", source: "pricing" },
    ]);
    return id;
  }

  it("exports everything about a person, without sign-in tokens", async () => {
    const db = await testDb();
    const id = await withHistory(db, "client");
    const data = await exportAccount(db, id);
    expect(data?.account).toMatchObject({ email: "client@example.com", signIns: ["google"] });
    expect(data?.playgroundRuns).toHaveLength(1);
    expect(data?.quizAttempts).toHaveLength(1);
    expect(data?.dailyResults).toHaveLength(1);
    expect(data?.waitlist.map((w) => w.plan).sort()).toEqual(["pro", "teams"]);
    expect(JSON.stringify(data)).not.toContain("secret-");
    expect(await exportAccount(db, "nobody")).toBeNull();
  });

  it("deletes the account and everything linked to it, and nothing else", async () => {
    const db = await testDb();
    const id = await withHistory(db, "client");
    await addUser(db, { role: "admin" });
    expect(await deleteAccount(db, id)).toEqual({ ok: true });

    for (const table of [accounts, challengeRuns, quizAttempts, dailyResults]) {
      expect(await db.select().from(table).where(eq(table.userId, id))).toHaveLength(0);
    }
    expect((await db.select().from(waitlist)).map((w) => w.email)).toEqual([
      "someone-else@example.com",
    ]);
    expect(await exportAccount(db, id)).toBeNull();
    expect(await deleteAccount(db, id)).toEqual({ ok: false, reason: "not-found" });
  });

  it("won't delete the last admin", async () => {
    const db = await testDb();
    const admin = await withHistory(db, "admin");
    expect(await deleteAccount(db, admin)).toEqual({ ok: false, reason: "last-admin" });
    await addUser(db, { role: "admin" });
    expect(await deleteAccount(db, admin)).toEqual({ ok: true });
  });
});
