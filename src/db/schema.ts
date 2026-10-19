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
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * The database schema. The first four tables are the ones Auth.js needs
 * (users, accounts, sessions, verification tokens), with two additions on
 * `users`: a role and a last-seen timestamp. The next two record what a
 * signed-in client does — every Playground run and every finished quiz,
 * re-graded on the server — so an admin can follow each client's progress.
 * Then the daily puzzle's results, the waitlist for paid plans, and the
 * live price test (who saw which price, and their price-perception answers).
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

/**
 * A signed-in player's best passing design for one daily puzzle (fewest
 * servers, then lowest P99). One row per player per day; the leaderboard
 * reads it in rank order.
 */
export const dailyResults = pgTable(
  "daily_result",
  {
    day: integer("day").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    servers: integer("servers").notNull(),
    p99Ms: integer("p99_ms").notNull(),
    errorRate: real("error_rate").notNull(),
    solvedAt: timestamp("solved_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.day, t.userId] }),
    index("daily_result_rank_idx").on(t.day, t.servers, t.p99Ms, t.solvedAt),
  ],
);

/**
 * Interest in a paid plan before it exists. `priceVariant`/`priceCents`
 * record the price the person saw, which is what a price test compares.
 */
export const waitlist = pgTable(
  "waitlist",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    plan: text("plan").notNull(),
    source: text("source").notNull(),
    priceVariant: text("price_variant"),
    priceCents: integer("price_cents"),
    /** The price test's arm, region and billing period, when a price was shown. */
    arm: text("arm"),
    segment: text("segment"),
    period: text("period"),
    visitorId: text("visitor_id"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("waitlist_email_plan_idx").on(t.email, t.plan)],
);

/**
 * One visitor seeing a Pro price on one page on one day: the denominator of
 * the price test. Logged by the page itself, so crawlers that don't run
 * scripts aren't counted.
 */
export const priceExposures = pgTable(
  "price_exposure",
  {
    visitorId: text("visitor_id").notNull(),
    page: text("page").notNull(),
    day: integer("day").notNull(),
    arm: text("arm").notNull(),
    segment: text("segment").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.visitorId, t.page, t.day] }),
    index("price_exposure_arm_idx").on(t.segment, t.arm),
  ],
);

/** Van Westendorp answers (monthly price, in the segment's currency), kept even when inconsistent. */
export const priceSurveys = pgTable("price_survey", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  visitorId: text("visitor_id"),
  segment: text("segment").notNull(),
  currency: text("currency").notNull(),
  tooCheap: integer("too_cheap").notNull(),
  cheap: integer("cheap").notNull(),
  expensive: integer("expensive").notNull(),
  tooExpensive: integer("too_expensive").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});
