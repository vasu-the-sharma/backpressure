import type { SystemGraph } from "@/sim/types";

/**
 * The landing page's live comparison: the same read path, twice. One copy gets
 * steady traffic. The other gets traffic that climbs past the database's
 * capacity, so a visitor watches it go from healthy to under pressure to
 * dropping requests, then recover, on a loop.
 *
 * Ticks are 10 ms so latency reads in realistic steps (43 ms healthy, ~1 s
 * with a full queue), and the demo runs in real time: one 100 ms frame is ten
 * ticks.
 */
export const DEMO_TICK_MS = 10;
export const DEMO_FRAME_MS = 100;
export const DEMO_TICKS_PER_FRAME = DEMO_FRAME_MS / DEMO_TICK_MS;

const TICKS_PER_SECOND = 1000 / DEMO_TICK_MS;
const DB_CAPACITY_PER_TICK = 100;
export const DB_CAPACITY_RPS = DB_CAPACITY_PER_TICK * TICKS_PER_SECOND;
/** A full queue holds ~1 s of work, so latency climbs for seconds before anything drops. */
export const DB_QUEUE_MAX = 10_000;

export const DEMO_GRAPH: SystemGraph = {
  entryId: "client",
  nodes: [
    {
      id: "client",
      kind: "client",
      label: "Clients",
      capacityPerTick: 1_000_000,
      replicas: 1,
      queueMax: 1_000_000,
      baseLatencyMs: 1,
    },
    {
      id: "gateway",
      kind: "gateway",
      label: "Gateway",
      capacityPerTick: 300,
      replicas: 1,
      queueMax: 3_000,
      baseLatencyMs: 2,
    },
    {
      id: "api",
      kind: "service",
      label: "API",
      capacityPerTick: 160,
      replicas: 1,
      queueMax: 2_000,
      baseLatencyMs: 4,
    },
    {
      id: "db",
      kind: "db",
      label: "Database",
      capacityPerTick: DB_CAPACITY_PER_TICK,
      replicas: 1,
      queueMax: DB_QUEUE_MAX,
      baseLatencyMs: 6,
    },
  ],
  edges: [
    { from: "client", to: "gateway" },
    { from: "gateway", to: "api" },
    { from: "api", to: "db" },
  ],
};

/** One rise, break and recovery of the rising side, in seconds. */
export const DEMO_CYCLE_S = 40;
/** Where the demo opens: the rising side has just turned amber. */
export const DEMO_START_S = 13;

const LOW = 0.5;
const HIGH = 1.16;
const smoothstep = (x: number) => x * x * (3 - 2 * x);
const cycleTime = (t: number) => ((t % DEMO_CYCLE_S) + DEMO_CYCLE_S) % DEMO_CYCLE_S;

export type DemoPhase = "quiet" | "rising" | "peak" | "falling";

/** Where the rising side is in its cycle. Scaling the database resets in the quiet phase. */
export function risingPhaseAt(t: number): DemoPhase {
  const s = cycleTime(t);
  if (s < 2 || s >= 36) return "quiet";
  if (s < 24) return "rising";
  if (s < 32) return "peak";
  return "falling";
}

/** Offered load on the rising side at time t (s), as a fraction of database capacity. */
export function risingLoadAt(t: number): number {
  const s = cycleTime(t);
  switch (risingPhaseAt(t)) {
    case "rising":
      return LOW + (HIGH - LOW) * smoothstep((s - 2) / 22);
    case "peak":
      return HIGH + 0.02 * Math.sin((3 * Math.PI * (s - 24)) / 8);
    case "falling":
      return HIGH - (HIGH - LOW) * smoothstep((s - 32) / 4);
    default:
      return LOW;
  }
}

/** Offered load on the steady side: a gentle swell well under capacity. */
export function steadyLoadAt(t: number): number {
  return 0.45 + 0.04 * Math.sin((2 * Math.PI * t) / 9);
}

/** Requests per tick for an offered-load fraction. */
export function ratePerTick(fraction: number): number {
  return fraction * DB_CAPACITY_PER_TICK;
}
