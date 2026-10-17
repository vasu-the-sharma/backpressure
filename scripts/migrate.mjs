// Apply pending database migrations (drizzle/*.sql) before `next build`.
// Skips cleanly when DATABASE_URL isn't set, so CI and local builds without a
// database still work. On Vercel, the Neon integration sets DATABASE_URL.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL not set; skipping migrations.");
} else {
  await migrate(drizzle(neon(url)), { migrationsFolder: "drizzle" });
  console.log("[migrate] Database is up to date.");
}
