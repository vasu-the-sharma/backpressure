import type { SystemGraph } from "@/sim/types";

/**
 * The landing page's live demo: a plain read path with no cache, so the
 * database is the hard ceiling. Offered load sweeps from comfortably under its
 * capacity to just past it and back, so a visitor watches a queue build,
 * tail latency climb, and requests drop — then the system recover.
 */
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
      capacityPerTick: 3_000,
      replicas: 1,
      queueMax: 9_000,
      baseLatencyMs: 2,
    },
    {
      id: "api",
      kind: "service",
      label: "API",
      capacityPerTick: 1_600,
      replicas: 1,
      queueMax: 4_000,
      baseLatencyMs: 4,
    },
    {
      id: "db",
      kind: "db",
      label: "Database",
      capacityPerTick: 1_000,
      replicas: 1,
      queueMax: 2_500,
      baseLatencyMs: 6,
    },
  ],
  edges: [
    { from: "client", to: "gateway" },
    { from: "gateway", to: "api" },
    { from: "api", to: "db" },
  ],
};

/** Frames per full load cycle (one frame = DEMO_TICKS_PER_FRAME ticks). */
export const DEMO_PERIOD_FRAMES = 160;
export const DEMO_TICKS_PER_FRAME = 2;

/** Offered load (requests/tick) at a given frame: 50% → 125% of the DB's capacity and back. */
export function demoRateAt(frame: number): number {
  const phase = (1 - Math.cos((2 * Math.PI * frame) / DEMO_PERIOD_FRAMES)) / 2; // 0..1..0
  return Math.round(500 + 750 * phase);
}
