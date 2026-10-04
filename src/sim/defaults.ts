import type { NodeKind, SimNode } from "./types";

/**
 * Sensible per-kind defaults so a player can drop a node on the canvas without
 * filling in a form. These mirror the magnitudes used by the authored systems
 * in `src/content/systems`. Replica count is the lever the player tunes; the
 * base capacity stays fixed per kind.
 */
export interface KindDefault {
  label: string;
  capacityPerTick: number;
  queueMax: number;
  baseLatencyMs: number;
  cacheHitRatio?: number;
  /** One-line role shown on the node and in the palette. */
  blurb: string;
}

export const NODE_DEFAULTS: Record<NodeKind, KindDefault> = {
  client: {
    label: "Client",
    capacityPerTick: 100_000,
    queueMax: 1_000_000,
    baseLatencyMs: 2,
    blurb: "Entry point — where requests originate",
  },
  cdn: {
    label: "CDN",
    capacityPerTick: 20_000,
    queueMax: 100_000,
    baseLatencyMs: 5,
    blurb: "Edge cache for static, geo-distributed reads",
  },
  gateway: {
    label: "API Gateway",
    capacityPerTick: 3_000,
    queueMax: 20_000,
    baseLatencyMs: 3,
    blurb: "Auth, routing, and rate limiting at the edge",
  },
  lb: {
    label: "Load Balancer",
    capacityPerTick: 8_000,
    queueMax: 20_000,
    baseLatencyMs: 1,
    blurb: "Spreads traffic across replicas",
  },
  service: {
    label: "Service",
    capacityPerTick: 2_000,
    queueMax: 10_000,
    baseLatencyMs: 5,
    blurb: "Stateless compute — scale it horizontally",
  },
  cache: {
    label: "Cache",
    capacityPerTick: 6_000,
    queueMax: 20_000,
    baseLatencyMs: 1,
    cacheHitRatio: 0.9,
    blurb: "In-memory hits short-circuit the downstream node",
  },
  queue: {
    label: "Queue",
    capacityPerTick: 5_000,
    queueMax: 100_000,
    baseLatencyMs: 1,
    blurb: "Buffers bursts and decouples producers",
  },
  db: {
    label: "Database",
    capacityPerTick: 1_500,
    queueMax: 10_000,
    baseLatencyMs: 6,
    blurb: "Durable store — the usual bottleneck",
  },
  storage: {
    label: "Object Storage",
    capacityPerTick: 1_000,
    queueMax: 10_000,
    baseLatencyMs: 8,
    blurb: "Durable blobs — high capacity, higher latency",
  },
};

/** Build a validated-shape SimNode from a kind, id, and replica count. */
export function makeNode(kind: NodeKind, id: string, replicas = 1): SimNode {
  const d = NODE_DEFAULTS[kind];
  const node: SimNode = {
    id,
    kind,
    label: d.label,
    capacityPerTick: d.capacityPerTick,
    replicas: Math.max(1, Math.floor(replicas)),
    queueMax: d.queueMax,
    baseLatencyMs: d.baseLatencyMs,
  };
  if (d.cacheHitRatio !== undefined) node.cacheHitRatio = d.cacheHitRatio;
  return node;
}
