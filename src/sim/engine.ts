import { RollingWindow, percentile } from "./metrics";
import { mulberry32 } from "./rng";
import type { SimConfig, SimState, SystemGraph } from "./types";

/** A single request flowing through the system along a precomputed path. */
interface SimRequest {
  id: number;
  /** Ordered node ids this request will visit. Always has at least one entry. */
  path: string[];
  /** Index into `path` of the node currently holding this request. */
  hop: number;
  /** Tick at which the request was admitted. */
  bornTick: number;
  /** Accumulated processing latency (sum of visited nodes' baseLatencyMs). */
  processingMs: number;
}

interface NodeRuntime {
  id: string;
  /** Requests waiting to be served this/next tick. */
  queue: SimRequest[];
  /** Requests that arrived this tick (served no earlier than next tick). */
  incoming: SimRequest[];
  /** Smoothed utilization in 0..1, exponential moving average. */
  emaUtil: number;
}

const DEFAULT_WINDOW_TICKS = 50;
const EMA_ALPHA = 0.15;

/**
 * Discrete-time, tick-based system simulator.
 *
 * One tick:
 *   1. requests served last tick land in their next node's queue;
 *   2. new arrivals are admitted at the entry node;
 *   3. every node serves up to (capacityPerTick * replicas) queued requests,
 *      advancing each to its next hop or completing it;
 *   4. any queue longer than queueMax drops its overflow (counted as errors);
 *   5. window metrics are recorded.
 *
 * A request's end-to-end latency is (completedTick - bornTick) * tickMs, which
 * captures all queueing and transit, plus the sum of per-node processing time.
 * As offered load approaches a node's capacity its queue grows and that delay
 * climbs sharply, which is the tail-latency behaviour the model exists to show.
 */
export class SimEngine {
  private readonly graph: SystemGraph;
  private readonly config: Required<SimConfig>;
  private readonly adjacency: Map<string, string[]>;
  private readonly nodeDefs: Map<string, SystemGraph["nodes"][number]>;
  private readonly runtimes: NodeRuntime[];
  private readonly runtimeById: Map<string, NodeRuntime>;
  private readonly window: RollingWindow;

  private rng: () => number;
  private arrivalRatePerTick: number;
  private nextRequestId = 0;
  private tickCount = 0;
  private inFlight = 0;

  constructor(graph: SystemGraph, config: SimConfig) {
    this.graph = graph;
    this.config = {
      windowTicks: config.windowTicks ?? DEFAULT_WINDOW_TICKS,
      ...config,
    };
    this.arrivalRatePerTick = config.arrivalRatePerTick;
    this.rng = mulberry32(config.seed);
    this.window = new RollingWindow(this.config.windowTicks);

    this.adjacency = new Map();
    for (const node of graph.nodes) this.adjacency.set(node.id, []);
    for (const edge of graph.edges) {
      const outs = this.adjacency.get(edge.from);
      if (outs) outs.push(edge.to);
    }

    this.nodeDefs = new Map(graph.nodes.map((n) => [n.id, n]));

    this.runtimes = graph.nodes.map((n) => ({
      id: n.id,
      queue: [],
      incoming: [],
      emaUtil: 0,
    }));
    this.runtimeById = new Map(this.runtimes.map((rt) => [rt.id, rt]));
  }

  // --- controls -----------------------------------------------------------

  getArrivalRatePerTick(): number {
    return this.arrivalRatePerTick;
  }

  setArrivalRatePerTick(rate: number): void {
    this.arrivalRatePerTick = Math.max(0, rate);
  }

  setReplicas(nodeId: string, replicas: number): void {
    const def = this.nodeDefs.get(nodeId);
    if (def) def.replicas = Math.max(1, Math.floor(replicas));
  }

  setDown(nodeId: string, down: boolean): void {
    const def = this.nodeDefs.get(nodeId);
    if (def) def.down = down;
  }

  /** Reset to an empty system while keeping the current graph mutations. */
  reset(): void {
    for (const rt of this.runtimes) {
      rt.queue.length = 0;
      rt.incoming.length = 0;
      rt.emaUtil = 0;
    }
    this.window.reset();
    this.rng = mulberry32(this.config.seed);
    this.nextRequestId = 0;
    this.tickCount = 0;
    this.inFlight = 0;
  }

  // --- simulation ---------------------------------------------------------

  tick(): void {
    this.tickCount += 1;

    // 1. land in-transit requests from the previous tick.
    for (const rt of this.runtimes) {
      if (rt.incoming.length > 0) {
        for (const req of rt.incoming) rt.queue.push(req);
        rt.incoming.length = 0;
      }
    }

    // 2. admit new arrivals at the entry node. Arrivals are Poisson around the
    // configured mean, so bursts build queues even below nominal capacity. This
    // is why tail latency grows as utilization approaches 1, not just past it.
    let admits = this.samplePoisson(this.arrivalRatePerTick);
    const entryRt = this.runtimeById.get(this.graph.entryId);
    while (admits > 0 && entryRt) {
      const path = this.computePath();
      entryRt.queue.push({
        id: this.nextRequestId++,
        path,
        hop: 0,
        bornTick: this.tickCount,
        processingMs: 0,
      });
      this.inFlight += 1;
      admits -= 1;
    }

    // 3. serve each node.
    const completedLatenciesMs: number[] = [];
    let completed = 0;
    for (const rt of this.runtimes) {
      const def = this.nodeDefs.get(rt.id);
      if (!def) continue;
      const capacity = def.down ? 0 : def.capacityPerTick * def.replicas;
      const served = Math.min(capacity, rt.queue.length);

      for (let i = 0; i < served; i++) {
        const req = rt.queue.shift();
        if (!req) break;
        req.processingMs += def.baseLatencyMs;
        req.hop += 1;
        const nextId = req.path[req.hop];
        if (nextId === undefined) {
          const latency = (this.tickCount - req.bornTick) * this.config.tickMs + req.processingMs;
          completedLatenciesMs.push(latency);
          completed += 1;
          this.inFlight -= 1;
        } else {
          const nextRt = this.runtimeById.get(nextId);
          if (nextRt) {
            nextRt.incoming.push(req);
            // Fan-out: this node emits extra copies downstream (write/read
            // amplification). One inbound request becomes `fanout` downstream.
            const fanout = def.fanout && def.fanout > 1 ? Math.floor(def.fanout) : 1;
            for (let f = 1; f < fanout; f++) {
              nextRt.incoming.push({
                id: this.nextRequestId++,
                path: req.path,
                hop: req.hop,
                bornTick: req.bornTick,
                processingMs: req.processingMs,
              });
              this.inFlight += 1;
            }
          } else {
            this.inFlight -= 1;
          }
        }
      }

      const util = capacity > 0 ? served / capacity : 0;
      rt.emaUtil = rt.emaUtil + EMA_ALPHA * (util - rt.emaUtil);
    }

    // 4. bound queues; overflow is dropped and counted as errors.
    let dropped = 0;
    for (const rt of this.runtimes) {
      const def = this.nodeDefs.get(rt.id);
      if (!def) continue;
      const overflow = rt.queue.length - def.queueMax;
      if (overflow > 0) {
        rt.queue.length = def.queueMax;
        dropped += overflow;
        this.inFlight -= overflow;
      }
    }

    // 5. record window metrics.
    this.window.push({ completedLatenciesMs, completed, dropped });
  }

  run(ticks: number): void {
    for (let i = 0; i < ticks; i++) this.tick();
  }

  // --- reporting ----------------------------------------------------------

  snapshot(): SimState {
    const latencies = this.window.sortedLatencies();
    const windowTicks = Math.max(1, this.window.ticks());
    const windowSeconds = (windowTicks * this.config.tickMs) / 1000;
    const completed = this.window.completed();
    const dropped = this.window.dropped();

    let bottleneckId: string | null = null;
    let maxUtil = -1;
    const nodes = this.runtimes.map((rt) => {
      const def = this.nodeDefs.get(rt.id);
      const down = def?.down ?? false;
      const util = rt.emaUtil;
      if (!down && util > maxUtil) {
        maxUtil = util;
        bottleneckId = rt.id;
      }
      return {
        id: rt.id,
        kind: def?.kind ?? "service",
        label: def?.label ?? rt.id,
        queueDepth: rt.queue.length,
        utilization: util,
        replicas: def?.replicas ?? 1,
        down,
      };
    });

    return {
      tick: this.tickCount,
      qps: completed / windowSeconds,
      p50Ms: percentile(latencies, 50),
      p99Ms: percentile(latencies, 99),
      errorRate: completed + dropped > 0 ? dropped / (completed + dropped) : 0,
      inFlight: this.inFlight,
      nodes,
      bottleneckId: maxUtil > 0 ? bottleneckId : null,
    };
  }

  // --- internals ----------------------------------------------------------

  /**
   * Walk the graph from the entry node to build one request's path. At a cache
   * node a seeded coin flip decides a hit (path ends there) or a miss (continue
   * to the downstream node). Otherwise the primary (first) outgoing edge is
   * followed. A visited set guards against cycles.
   */
  private computePath(): string[] {
    const path: string[] = [];
    const visited = new Set<string>();
    let current: string | undefined = this.graph.entryId;

    while (current !== undefined && !visited.has(current)) {
      visited.add(current);
      path.push(current);

      const def = this.nodeDefs.get(current);
      const outs: string[] = this.adjacency.get(current) ?? [];
      if (outs.length === 0) break;

      // A cache or CDN node with a hit ratio serves a fraction of requests
      // itself; on a hit the path ends here instead of reaching downstream.
      if (def && (def.kind === "cache" || def.kind === "cdn") && def.cacheHitRatio !== undefined) {
        if (this.rng() < def.cacheHitRatio) break;
      }

      current = outs[0];
    }

    return path;
  }

  /** Seeded Poisson sample: Knuth for small means, normal approximation for large. */
  private samplePoisson(lambda: number): number {
    if (lambda <= 0) return 0;
    if (lambda < 30) {
      const limit = Math.exp(-lambda);
      let k = 0;
      let p = 1;
      do {
        k += 1;
        p *= this.rng();
      } while (p > limit);
      return k - 1;
    }
    const sample = Math.round(lambda + Math.sqrt(lambda) * this.gaussian());
    return sample < 0 ? 0 : sample;
  }

  /** Standard-normal sample via Box-Muller, drawing from the seeded stream. */
  private gaussian(): number {
    const u1 = Math.max(this.rng(), 1e-12);
    const u2 = this.rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}
