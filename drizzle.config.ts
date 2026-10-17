import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// `vercel env pull` writes .env.local; read it so drizzle-kit sees DATABASE_URL.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
