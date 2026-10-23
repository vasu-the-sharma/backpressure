# Backpressure

A lab for system design. Every architecture on the site is a running
simulation: send it traffic, take a node down, add replicas, and watch latency,
throughput and the bottleneck respond.

**Live:** https://backpressure.vercel.app

The name is the thing you get to watch. When one stage of a system can't keep
up, its queue fills and the pressure travels back to everything feeding it.

## What's in it

- **Systems.** Real architectures (Uber, WhatsApp, a URL shortener) to drive
  under load.
- **Playground.** Design a system on a canvas; the simulator grades it against
  an SLO.
- **Quiz.** Short drills on load, caching, fan-out and bottlenecks.
- **Daily.** One puzzle a day: meet the targets with the fewest servers. Par,
  a leaderboard, streaks and a shareable result.
- **Pricing.** Free, Pro and Teams. Pro isn't on sale yet, so the page runs a
  live price test.

## How the simulator works

`src/sim` is a deterministic, tick-based model of a request graph. It has no
framework imports and its own tests.

- Each node is a bounded queue that serves `capacityPerTick × replicas`
  requests a tick. Whatever overflows the queue is dropped and counted as an
  error.
- Arrivals are Poisson around the offered rate, so bursts build queues even
  below capacity. That is why tail latency climbs as utilization nears 1.
- A request follows each node's first outgoing edge. A cache or CDN hit ends
  it there, `fanout` multiplies it downstream, a `publish` node delivers it to
  every edge, and `bandwidthPerTick` makes a node limited by bytes, not request
  count.
- Latency is the ticks a request spent in the system plus each node's
  processing time, so congestion shows up directly as latency.
- Randomness comes from a seeded RNG and the engine never reads the clock. The
  same graph, load and seed always produce the same run. Server-side grading,
  the leaderboard and par all rely on that.

The shapes are real: saturation, cascading outages, a bottleneck that moves
when you scale. The exact milliseconds are a model's, not anyone's production
telemetry.

## Architecture

- **Content is code.** Systems, challenges and quizzes are typed modules
  validated with Zod at build time, so a bad entry fails `next build` instead
  of a page load. Most pages are statically generated.
- **The simulator runs in the browser.** It's pure computation, and a server
  would only add latency.
- **The server handles what the browser can't be trusted with.** Playground
  runs, quiz answers and daily designs from signed-in players are re-graded on
  the server with the same engine before anything is stored (`src/server`).
  The browser never gets to say "I passed".
- **Accounts** use Auth.js v5 (Google) with database sessions and Drizzle ORM on
  Postgres (Neon). Roles are `client` and `admin`; the emails in `ADMIN_EMAILS`
  become admins when they sign in.
- **No account required.** With no database or sign-in configured, the site
  still works fully. Accounts, the leaderboard, the waitlist and the price test
  switch on once they are configured.

## Daily puzzle

Puzzle *n* is a pure function of *n* (`src/content/daily/generate.ts`). Each day
picks one of four templates (hot reads, fan-out writes, latency budget, media
launch) and seeds its traffic, hit ratios and rules. Daily #1 was 19 October
2026, and the puzzle changes at midnight UTC.

The engine's limit is sharp: a component keeps up at 99% utilization and falls
behind at 101%. The generator only accepts traffic levels that sit clearly on
one side of every replica boundary, so par is exact arithmetic, not a search.
Tests check it against the real engine. The par design must pass, the obvious
design must fail, and removing one replica anywhere must fail.

Passing designs from signed-in players are re-graded and kept if they beat the
player's best (fewer servers, then lower p99). Signed-out players keep their
runs and streak in localStorage. A result shares as a spoiler-free grid plus a
`/daily/s/<code>` link with its own preview image. Past puzzles are a Pro
feature.

## Price test

Pro isn't for sale yet, so `/pricing` measures demand instead of taking
payment:

1. Middleware gives each visitor an anonymous id and one of three Pro prices
   at random, kept for a year: $19, $29 or $39 a month, or ₹599, ₹999 or
   ₹1,499 in India (from Vercel's country header).
2. Each page that shows a price logs one exposure per visitor per day.
3. Joining the waitlist records the price arm and billing period. The price is
   looked up on the server.
4. People who join answer the four Van Westendorp questions.

`/admin/pricing` reports:
- the join rate per arm, with a 95% Wilson interval;
- a revenue index (price × join rate);
- the Van Westendorp price points.

Visitors in the EU, EEA, UK and Switzerland are asked before any test cookie
is set. Until they agree, and for anyone who opts out on `/privacy`, the
middleware shows the middle price, sets no cookies and leaves them out of the
results.

## Waitlist

- **Email.** A new member gets one confirmation through Resend. Every email
  carries RFC 8058 one-click unsubscribe headers and a leave link signed with
  `AUTH_SECRET`. The link opens a page with a button, so mail scanners can't
  unsubscribe anyone.
- **Bots.** Signed-out sign-ups are screened with a hidden field, a minimum
  fill time and a cap of five an hour per network. The network is a
  daily-rotating HMAC of the IP, erased after 24 hours; the IP itself is never
  stored.
- **Admin.** `/admin/waitlist` lists members with the price each was shown,
  exports CSV, and emails a plan's list. `{price}` in a message becomes each
  person's quoted price.

## Stack

Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS 4, React
Flow, Auth.js v5, Drizzle ORM, Neon Postgres, Zod, Vitest with PGlite, Biome,
hosted on Vercel.

## Running it

Node 20 or later.

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # engine, content calibration, server logic on in-memory Postgres
npm run typecheck
npm run lint
npm run build        # runs pending DB migrations first when DATABASE_URL is set
```

`DAILY_HORIZON=365 npm test` also verifies a year of daily puzzles, at about a
second per day.

### Configuration (all optional)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres. On Vercel, the Neon integration sets it. |
| `AUTH_SECRET` | Signs sessions. Generate one with `npx auth secret`. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google OAuth client, with redirect URI `https://<domain>/api/auth/callback/google` (and the `localhost:3000` equivalent). |
| `ADMIN_EMAILS` | Comma-separated. These people become admins when they sign in. |
| `CONTACT_EMAIL` | Shown on `/privacy` and `/terms` for privacy and support requests. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Waitlist email. `EMAIL_FROM` must be on a domain verified in Resend. |

**Local setup.** Run `vercel env pull .env.local`, then `npm run db:migrate`.

**Schema changes.** Edit `src/db/schema.ts`, then run `npm run db:generate`.
Migrations in `drizzle/` apply automatically before every build.

**Previews.** Turn on Neon's database branch per preview deployment, so pull
request previews never migrate production.

**Analytics.** Turn on Web Analytics in the Vercel project; the component is
already in the layout. It sets no cookies, URLs are cut at `?` before
sending, and `/admin` isn't counted. `sitemap.xml` and `robots.txt` are
generated from the content registries.

## Project layout

```
src/
  sim/         the engine: types, seeded RNG, metrics, tick loop, SLO scoring
  content/     systems, challenges, quizzes, daily puzzle, pricing (typed data and tests)
  server/      grading, progress, daily results, the price test, waitlist email and abuse checks
  db/          Drizzle schema (migrations live in /drizzle)
  app/         routes
  components/  UI, including PlaygroundCanvas, Simulator, CompareDemo and DailyGame
  lib/         motion springs, brand geometry, formatting, link-preview images
```

## Adding content

**A system.** Add `src/content/systems/<slug>.ts`, export a `SystemInput`, and
register it in `src/content/registry.ts`. The page, its metadata and its
simulator all come from that one module.

**A challenge.** Add `src/content/challenges/<slug>.ts` and register it.
- Scenario rules go in `kinds`: fan-out, pub-sub topics, bandwidth limits, hit
  ratios and replica caps.
- Ordering rules go in `before`, for example "the service comes before the
  cache".
- Every challenge ships a `calibration` pair: a design that should fail and one
  that should pass. CI runs both, so a challenge that stops teaching its lesson
  breaks the build.

## Design

- **Look.** A black canvas, hairlines instead of shadows, white for primary
  actions, and one blue accent for focus.
- **State colours.** Green, amber and red only ever mean system state, and
  every state also carries a label or number.
- **Motion.** Uses critically damped springs (`src/lib/motion`), sampled into
  CSS as `--ease-spring`.
- **Accessibility.** Reduced motion, reduced transparency and increased
  contrast are all respected.
- **Tokens** live in `src/app/globals.css`.
