# System Design Lab

Interactive, honest models of how large-scale systems behave under load. Open a
system, send it traffic, take a node down, scale it, and watch throughput, tail
latency, and the bottleneck respond in real time.

> Working title. `system-design-lab` is a placeholder; rename to your own brand
> before publishing.

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
  are statically generated; the simulator is the only client component.
- **Zod** validates content at build time.
- **Vitest** for the engine.
- **Tailwind CSS** for styling.
- **Biome** for lint and format.
- **Vercel** for hosting.

## Project structure

```
src/
  sim/            Pure simulation engine (no framework imports)
    types.ts      Graph, node, config, and state types
    rng.ts        Seeded PRNG
    metrics.ts    Percentiles and the rolling metric window
    engine.ts     The tick loop
    engine.test.ts
  content/        Content as typed, validated data
    schema.ts     Zod schema and the System type
    registry.ts   Loads and validates all systems at build time
    systems/      One module per system
  app/            Next.js App Router (SSG pages)
    page.tsx      Home: the system catalog
    products/[slug]/page.tsx
  components/
    Simulator.tsx The client island that drives the engine
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

## Adding a system

Create `src/content/systems/<slug>.ts`, export a `SystemInput`, and register it
in `src/content/registry.ts`. The schema validates it at build time, and the
page, metadata, and simulator are generated from that one module.
