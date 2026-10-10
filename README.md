# Backpressure

Interactive, honest models of how large-scale systems behave under load. Open a
system, send it traffic, take a node down, scale it, and watch throughput, tail
latency, and the bottleneck respond in real time.

> **Backpressure** is the term for a loaded system pushing back on its upstream
> producers — the queue depth climbing until a stage can take no more. That is
> exactly what these models let you watch happen, which is where the name comes
> from.

## What it is

Most system-design material is static: diagrams you read and architecture posts
you nod along to. This is a model you can drive. Each system is a small running
simulation, so the behavior you are taught about (a queue backing up, an outage
cascading, a bottleneck moving when you add capacity) actually happens in front
of you.

The numbers come from a simplified simulator, not production telemetry. They are
directionally honest: utilization approaching capacity blows up tail latency, a
downed node sheds load, and scaling one tier exposes the next. They are not a
claim about any company's real latency or SLA. That honesty is deliberate. Fake
precision is the fastest way to lose a technical reader.

## Why it is built this way

The architecture is the point of this project, so the decisions are explicit.

**Content is static, the simulator is client-side.** The catalog (systems,
their graphs, their write-ups) is read-mostly and authored in the repo, so it is
statically generated at build time. Pages serve from the edge, render instantly,
and are fully indexable. The simulator is pure computation that belongs in the
browser; a server would add latency and nothing else. There is no backend in the
MVP because nothing in the MVP needs one.

**Content lives in the repo, not a database.** Each system is a typed module
validated by a schema at build time. That buys version history, pull-request
review, and compile-time safety on every content change, and it means a bad
entry fails `next build` instead of a user's page load. A database would add a
query per page and an admin UI to edit what a text file already does better. The
database arrives when the data is genuinely dynamic (accounts, billing,
progress), and that data is relational, so it will be Postgres, not a document
store.

**The simulation engine is a pure, framework-agnostic module.** It imports
nothing from React or Next and is tested in isolation. The UI is a thin layer
over it. This keeps the interesting logic honest and portable, and it is why the
engine has unit tests while the UI does not yet need them.

**Seams are left for the paid surface, but not built early.** Interview grading
(an LLM call that cannot expose keys to the browser) and accounts/billing are
real backend needs. They are deferred, not designed out: Next route handlers
cover the first dynamic endpoints, and a separate service (FastAPI, which suits
the Python/AI work) splits off when that surface is real.

## The simulation engine

The engine (`src/sim`) is a discrete-time, tick-based model of a request graph.

- Each node is a bounded queue with a per-tick service capacity that scales with
  its replica count.
- Requests are admitted at the entry node following a seeded Poisson process, so
  bursts build queues even below nominal capacity. That burstiness is why tail
  latency grows as utilization approaches one, not only past it.
- Each tick, every node serves what it can, advances requests to their next hop
  or completes them, and drops whatever overflows its bounded queue (counted as
  errors). A cache node resolves a seeded hit or miss, modelling the cache-aside
  read path.
- End-to-end latency is the ticks a request spent in the system plus per-node
  processing, so congestion shows up directly as latency.

Everything is driven by a seeded RNG with no wall-clock reads, so a run is
deterministic: the same graph, config, and seed reproduce exactly. That is what
makes a future "share this failing scenario as a URL" feature possible.

The test suite (`src/sim/engine.test.ts`) pins the behaviors the model exists to
demonstrate: deterministic replay, tail latency climbing as load approaches and
exceeds capacity, an outage cascading into shed load, and the bottleneck moving
downstream when a tier is scaled.

## Tech stack

- **Next.js (App Router) + React + TypeScript** in strict mode. Content pages
  are statically generated; the interactive pieces are client islands.
- **Zod** validates content at build time.
- **Vitest** for the engine.
- **Tailwind CSS** for styling.
- **Biome** for lint and format.
- **Vercel** for hosting.

## Design system

The UI is a black canvas with near-black panels separated by hairlines rather
than shadows. White carries primary actions and one blue accent marks focus and
selection. Beyond that, color is reserved for system state, and only three exist:
green (headroom), amber (the bottleneck / stress), red (saturation, drops, an
outage). Color is never the only signal; every state also has a label or number.

- **Tokens** live in `src/app/globals.css` (`@theme`): surfaces `canvas` →
  `surface` → `surface-2` → `fill`, hairlines `line` / `line-strong`, text
  `fg` → `fg-4`, and `ok` / `warn` / `bad` with text-safe `*-fg` tints.
- **Type**: Inter (optical sizing) for text, JetBrains Mono for every number
  (`.tnum`). Index pages open with large display type (`.display`); inside the
  app the scale is fixed: title `text-2xl`, section `text-base font-medium`,
  body `text-sm`, meta `text-xs`.
- **Primitives**: `.panel`, `.btn` (+ `-primary` / `-secondary` / `-ghost`, sizes),
  `.range`, `.kbd`, `.skeleton`, `.focus-ring`; layout pieces in
  `src/components/ui.tsx`. Radii are 6px (controls) and 8px (panels).
- **Motion** is entrance-only (`.rise-in`, `<Reveal>`) and honors
  `prefers-reduced-motion`.

## Project structure

```
src/
  sim/            Pure simulation engine (no framework imports)
    types.ts      Graph, node, config, and state types
    rng.ts        Seeded PRNG
    metrics.ts    Percentiles and the rolling metric window
    engine.ts     The tick loop
    score.ts      Run a design to steady state and grade it against an SLO
    engine.test.ts
  content/        Content as typed, validated data
    schema.ts     Zod schema and the System type
    registry.ts   Loads and validates all systems at build time
    systems/      One module per system
    challenges/   Playground scenarios (load profile + SLO)
    quizzes/      Quiz modules
    verticals.ts  The product areas; drives the nav and landing
    demo.ts       The landing page's live demo graph and load sweep
  lib/            Small pure helpers for the UI
  app/            Next.js App Router (SSG pages)
    page.tsx      Landing, with the live demo
    systems/      Catalog and /systems/[slug] (the simulator)
    playground/   Challenges and /playground/[slug] (the design canvas)
    quiz/         Quizzes and /quiz/[slug]
  components/
    Simulator.tsx         The live model on each system page
    LiveDemo.tsx          The landing page's running demo
    PlaygroundCanvas.tsx  The design canvas (React Flow)
    QuizRunner.tsx        The quiz player
    ui.tsx                Layout primitives that encode the type scale
```

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine unit tests
npm run typecheck  # tsc --noEmit
npm run build      # production build (static generation)
```

Node 20 or newer (see `.nvmrc`).

## Roadmap

- More systems. The schema is designed so adding one is a data task, not a code
  task. Only the graph and a blurb are required; the write-up fills in over time.
- A rendered node-graph with animated request particles over the current engine.
- Auto-layout for diagrams so a system is authored as nodes and edges only.
- Interview mode: explain a system and get graded against a rubric derived from
  its schema. First real backend surface.
- Accounts, saved progress, and billing on Postgres, when there is something to
  bill for.

## Adding a challenge

Create `src/content/challenges/<slug>.ts`, export a `Challenge`, and register it
in `src/content/challenges/registry.ts`. Scenario behaviour goes in `kinds`
(per node kind: `fanout`, `publish` + `minSubscribers` for a pub-sub topic,
`bandwidthPerTick` with `load.requestBytes` for bandwidth-bound nodes,
`cacheHitRatio`, `maxReplicas`). Every challenge must ship a `calibration`
pair — the obvious design that should fail and the reference that should pass —
and `calibration.test.ts` runs both through the same builder the canvas uses,
so a challenge that stops teaching its lesson fails CI.

## Adding a system

Create `src/content/systems/<slug>.ts`, export a `SystemInput`, and register it
in `src/content/registry.ts`. The schema validates it at build time, and the
page, metadata, and simulator are generated from that one module.
