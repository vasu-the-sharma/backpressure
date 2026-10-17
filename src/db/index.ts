import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * Any Postgres-backed Drizzle database with our schema. Production uses Neon's
 * HTTP driver; tests use an in-memory PGlite. Server code takes a `Db` so the
 * same queries run against both. (Neon's HTTP driver has no interactive
 * transactions, so nothing here relies on them.)
 */
// biome-ignore lint/suspicious/noExplicitAny: the query-result type differs per driver
export type Db = PgDatabase<PgQueryResultHKT | any, typeof schema>;

let db: Db | null = null;

/** The app's database, created on first use so builds without DATABASE_URL still work. */
export function getDb(): Db {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
    db = drizzle(neon(url), { schema }) as unknown as Db;
  }
  return db;
}
