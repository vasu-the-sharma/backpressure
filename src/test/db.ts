import type { Db } from "@/db";
import * as schema from "@/db/schema";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

/** A fresh in-memory Postgres with every migration applied — the real schema, no server needed. */
export async function testDb(): Promise<Db> {
  const client = new PGlite();
  // PGlite takes the machine's time zone; Neon runs in UTC, and so do the tests.
  await client.exec("SET TIME ZONE 'UTC'");
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db as unknown as Db;
}

export async function addUser(
  db: Db,
  values: Partial<typeof schema.users.$inferInsert> = {},
): Promise<string> {
  const [row] = await db
    .insert(schema.users)
    .values({ email: `${crypto.randomUUID()}@example.com`, ...values })
    .returning({ id: schema.users.id });
  if (!row) throw new Error("insert failed");
  return row.id;
}
