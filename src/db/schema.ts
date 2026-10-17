import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * The database schema. The first four tables are the ones Auth.js needs
 * (users, accounts, sessions, verification tokens), with two additions on
 * `users`: a role and a last-seen timestamp. The last two record what a
 * signed-in client does — every Playground run and every finished quiz,
 * re-graded on the server — so an admin can follow each client's progress.
 */

export const roleEnum = pgEnum("role", ["client", "admin"]);
export type Role = (typeof roleEnum.enumValues)[number];

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: roleEnum("role").notNull().default("client"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { mode: "date" }),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/** One Playground run, as scored by the server. */
export const challengeRuns = pgTable(
  "challenge_run",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    challengeSlug: text("challenge_slug").notNull(),
    passed: boolean("passed").notNull(),
    p99Ms: integer("p99_ms").notNull(),
    errorRate: real("error_rate").notNull(),
    throughputRps: integer("throughput_rps").notNull(),
    nodeCount: integer("node_count").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("challenge_run_user_idx").on(t.userId, t.createdAt)],
);

/** One finished quiz, as graded by the server. */
export const quizAttempts = pgTable(
  "quiz_attempt",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quizSlug: text("quiz_slug").notNull(),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("quiz_attempt_user_idx").on(t.userId, t.createdAt)],
);
