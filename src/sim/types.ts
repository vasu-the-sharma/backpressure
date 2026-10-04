/**
 * Core types for the simulation engine.
 *
 * The engine is a discrete-time, tick-based model. It is deliberately a
 * teaching approximation, not a queueing-theory solver: it is directionally
 * correct (utilization approaching capacity blows up tail latency, a downed
 * node cascades, scaling moves the bottleneck) and deterministic for a given
 * seed, which is what the UI and the shareable-URL feature rely on.
 */

export type NodeKind =
  | "client"
  | "cdn"
  | "gateway"
  | "lb"
  | "service"
  | "cache"
  | "queue"
  | "db"
  | "storage";

export interface SimNode {
  id: string;
  kind: NodeKind;
  label: string;
  /** Requests one replica can serve per tick. Effective capacity scales with `replicas`. */
  capacityPerTick: number;
  /** Horizontal scale factor. Effective capacity = capacityPerTick * replicas. */
  replicas: number;
  /** Max requests allowed to wait in this node's queue. Excess is dropped (errors). */
  queueMax: number;
  /** Fixed processing latency added each time a request is served by this node, in ms. */
  baseLatencyMs: number;
  /**
   * Cache nodes only: fraction of requests served from cache (0..1). On a hit the
   * request completes at the cache and never reaches the downstream node, which is
   * how the cache-aside read path is modelled.
   */
  cacheHitRatio?: number;
  /**
   * Requests emitted downstream per request this node forwards. >1 models
   * fan-out / write amplification: one inbound request (e.g. a tweet) becomes
   * `fanout` downstream requests (e.g. one write per follower timeline).
   * Defaults to 1 (no amplification).
   */
  fanout?: number;
  /** When true the node serves nothing; its queue fills and overflows. Models an outage. */
  down?: boolean;
}

export interface SimEdge {
  from: string;
  to: string;
}

export interface SystemGraph {
  nodes: SimNode[];
  edges: SimEdge[];
  /** Node where requests enter the system (typically the client or CDN). */
  entryId: string;
}

export interface SimConfig {
  /** Offered load: mean requests admitted per tick. Dialed by the "traffic" control. */
  arrivalRatePerTick: number;
  /** Simulated milliseconds represented by one tick. */
  tickMs: number;
  /** Deterministic seed. Same seed + graph + config produces an identical run. */
  seed: number;
  /** Rolling window (in ticks) used to compute live metrics. Defaults to 50. */
  windowTicks?: number;
}

export interface NodeState {
  id: string;
  kind: NodeKind;
  label: string;
  queueDepth: number;
  /** Smoothed utilization 0..1 (served / effective capacity). */
  utilization: number;
  replicas: number;
  down: boolean;
}

export interface SimState {
  tick: number;
  /** Completed requests per second over the window. */
  qps: number;
  p50Ms: number;
  p99Ms: number;
  /** Dropped / (dropped + completed) over the window, 0..1. */
  errorRate: number;
  inFlight: number;
  nodes: NodeState[];
  /** Id of the highest-utilization healthy node, or null if the system is idle. */
  bottleneckId: string | null;
}
