import { describe, expect, it } from "vitest";
import { SimEngine } from "./engine";
import type { SystemGraph } from "./types";

/**
 * A three-node linear system: client -> service -> db.
 * `service` is the deliberate bottleneck; its capacity is the knob under test.
 */
function linearGraph(
  serviceCapacity: number,
  dbCapacity = 1000,
  serviceQueueMax = 100_000,
): SystemGraph {
  return {
    entryId: "client",
    nodes: [
      {
        id: "client",
        kind: "client",
        label: "Client",
        capacityPerTick: 100_000,
        replicas: 1,
        queueMax: 1_000_000,
        baseLatencyMs: 1,
      },
      {
        id: "svc",
        kind: "service",
        label: "Service",
        capacityPerTick: serviceCapacity,
        replicas: 1,
        queueMax: serviceQueueMax,
        baseLatencyMs: 5,
      },
      {
        id: "db",
        kind: "db",
        label: "Database",
        capacityPerTick: dbCapacity,
        replicas: 1,
        queueMax: 100_000,
        baseLatencyMs: 5,
      },
    ],
    edges: [
      { from: "client", to: "svc" },
      { from: "svc", to: "db" },
    ],
  };
}

const TICK_MS = 100;

describe("SimEngine determinism", () => {
  it("produces identical runs for the same seed", () => {
    const run = () => {
      const engine = new SimEngine(linearGraph(100), {
        arrivalRatePerTick: 80,
        tickMs: TICK_MS,
        seed: 42,
      });
      engine.run(300);
      return engine.snapshot();
    };

    const a = run();
    const b = run();
    expect(b.qps).toBe(a.qps);
    expect(b.p50Ms).toBe(a.p50Ms);
    expect(b.p99Ms).toBe(a.p99Ms);
    expect(b.errorRate).toBe(a.errorRate);
    expect(b.bottleneckId).toBe(a.bottleneckId);
  });
});

describe("SimEngine under light load", () => {
  it("stays healthy: near-zero errors and bounded latency", () => {
    const engine = new SimEngine(linearGraph(100), {
      arrivalRatePerTick: 50, // utilization ~0.5 at the service
      tickMs: TICK_MS,
      seed: 7,
    });
    engine.run(400);
    const s = engine.snapshot();

    expect(s.errorRate).toBeLessThan(0.02);
    expect(s.p99Ms).toBeLessThan(700);
    expect(s.qps).toBeGreaterThan(400); // ~50/tick * 10 ticks/s
  });
});

describe("SimEngine tail latency vs utilization", () => {
  it("P99 climbs as offered load approaches and exceeds capacity", () => {
    const p99For = (arrivalRatePerTick: number): number => {
      const engine = new SimEngine(linearGraph(100), {
        arrivalRatePerTick,
        tickMs: TICK_MS,
        seed: 99,
      });
      engine.run(600);
      return engine.snapshot().p99Ms;
    };

    const low = p99For(50); // 0.5x capacity
    const near = p99For(95); // 0.95x capacity
    const over = p99For(120); // 1.2x capacity

    expect(near).toBeGreaterThanOrEqual(low);
    expect(over).toBeGreaterThan(near);
    expect(over).toBeGreaterThan(low * 3);
  });
});

describe("SimEngine failure injection", () => {
  it("cascades into errors when a node goes down", () => {
    // A realistically bounded service buffer (300): once the node is down the
    // buffer fills and further requests are shed, which is how the outage shows up.
    const engine = new SimEngine(linearGraph(100, 1000, 300), {
      arrivalRatePerTick: 50,
      tickMs: TICK_MS,
      seed: 3,
    });
    engine.run(300);
    const before = engine.snapshot();
    expect(before.errorRate).toBeLessThan(0.02);

    engine.setDown("svc", true);
    engine.run(300);
    const after = engine.snapshot();

    expect(after.errorRate).toBeGreaterThan(0.5);
    expect(after.qps).toBeLessThan(before.qps * 0.5);
  });
});

describe("SimEngine scaling", () => {
  it("moves the bottleneck downstream and raises throughput", () => {
    // service (cap 100) is the bottleneck; db (cap 120) has little headroom.
    const engine = new SimEngine(linearGraph(100, 120), {
      arrivalRatePerTick: 110,
      tickMs: TICK_MS,
      seed: 11,
    });
    engine.run(400);
    const before = engine.snapshot();
    expect(before.bottleneckId).toBe("svc");

    engine.setReplicas("svc", 2); // effective service capacity 200
    engine.run(400);
    const after = engine.snapshot();

    expect(after.bottleneckId).toBe("db");
    expect(after.qps).toBeGreaterThan(before.qps);
  });
});

/**
 * client -> write service (fan-out F) -> timeline store.
 * The service has ample capacity; `fanout` multiplies the load that reaches the
 * store, modelling fan-out-on-write amplification.
 */
function fanoutGraph(fanout: number, dbCapacity = 100): SystemGraph {
  return {
    entryId: "client",
    nodes: [
      {
        id: "client",
        kind: "client",
        label: "Client",
        capacityPerTick: 100_000,
        replicas: 1,
        queueMax: 1_000_000,
        baseLatencyMs: 1,
      },
      {
        id: "svc",
        kind: "service",
        label: "Write service",
        capacityPerTick: 100_000,
        replicas: 1,
        queueMax: 100_000,
        baseLatencyMs: 2,
        fanout,
      },
      {
        id: "db",
        kind: "db",
        label: "Timeline store",
        capacityPerTick: dbCapacity,
        replicas: 1,
        queueMax: 5_000,
        baseLatencyMs: 5,
      },
    ],
    edges: [
      { from: "client", to: "svc" },
      { from: "svc", to: "db" },
    ],
  };
}

describe("SimEngine fan-out", () => {
  it("amplifies downstream load by the fanout factor", () => {
    const snapFor = (fanout: number) => {
      const engine = new SimEngine(fanoutGraph(fanout, 100), {
        arrivalRatePerTick: 50,
        tickMs: TICK_MS,
        seed: 5,
      });
      engine.run(400);
      return engine.snapshot();
    };

    const none = snapFor(1); // store sees ~50/tick against cap 100 — healthy
    const heavy = snapFor(5); // store sees ~250/tick against cap 100 — overloaded

    expect(none.errorRate).toBeLessThan(0.02);
    expect(heavy.errorRate).toBeGreaterThan(0.3);
    // the store completes more work when fanned (it is saturated), proving the
    // amplification actually reached it.
    expect(heavy.qps).toBeGreaterThan(none.qps);
  });

  it("stays deterministic with fan-out", () => {
    const run = () => {
      const engine = new SimEngine(fanoutGraph(8, 200), {
        arrivalRatePerTick: 40,
        tickMs: TICK_MS,
        seed: 21,
      });
      engine.run(300);
      return engine.snapshot();
    };
    const a = run();
    const b = run();
    expect(b.qps).toBe(a.qps);
    expect(b.errorRate).toBe(a.errorRate);
    expect(b.p99Ms).toBe(a.p99Ms);
  });
});

describe("SimEngine CDN caching", () => {
  it("a CDN node with a hit ratio shields the downstream origin", () => {
    const graph = (withCdn: boolean): SystemGraph => ({
      entryId: "client",
      nodes: [
        {
          id: "client",
          kind: "client",
          label: "Client",
          capacityPerTick: 100_000,
          replicas: 1,
          queueMax: 1_000_000,
          baseLatencyMs: 1,
        },
        {
          id: "edge",
          kind: "cdn",
          label: "CDN",
          capacityPerTick: 100_000,
          replicas: 1,
          queueMax: 100_000,
          baseLatencyMs: 2,
          ...(withCdn ? { cacheHitRatio: 0.9 } : {}),
        },
        {
          id: "db",
          kind: "db",
          label: "Origin",
          capacityPerTick: 60,
          replicas: 1,
          queueMax: 2_000,
          baseLatencyMs: 5,
        },
      ],
      edges: [
        { from: "client", to: "edge" },
        { from: "edge", to: "db" },
      ],
    });
    const snap = (withCdn: boolean) => {
      const engine = new SimEngine(graph(withCdn), {
        arrivalRatePerTick: 100,
        tickMs: TICK_MS,
        seed: 4,
      });
      engine.run(400);
      return engine.snapshot();
    };

    const cached = snap(true); // ~90% served at the CDN; ~10/tick reach the origin (cap 60)
    const uncached = snap(false); // all 100/tick reach the origin (cap 60) — overloaded

    expect(cached.errorRate).toBeLessThan(0.02);
    expect(uncached.errorRate).toBeGreaterThan(0.3);
  });
});

/**
 * client -> topic -> {subA, subB, subC}. With `publish`, the topic delivers each
 * event to every subscriber; without it, only the first edge (subA) is used.
 */
function pubsubGraph(publish: boolean): SystemGraph {
  const sub = (id: string) => ({
    id,
    kind: "service" as const,
    label: id,
    capacityPerTick: 500,
    replicas: 1,
    queueMax: 100_000,
    baseLatencyMs: 2,
  });
  return {
    entryId: "client",
    nodes: [
      {
        id: "client",
        kind: "client",
        label: "Client",
        capacityPerTick: 100_000,
        replicas: 1,
        queueMax: 1_000_000,
        baseLatencyMs: 1,
      },
      {
        id: "topic",
        kind: "queue",
        label: "Topic",
        capacityPerTick: 100_000,
        replicas: 1,
        queueMax: 100_000,
        baseLatencyMs: 1,
        publish,
      },
      sub("subA"),
      sub("subB"),
      sub("subC"),
    ],
    edges: [
      { from: "client", to: "topic" },
      { from: "topic", to: "subA" },
      { from: "topic", to: "subB" },
      { from: "topic", to: "subC" },
    ],
  };
}

describe("SimEngine pub-sub", () => {
  it("a publish node delivers to every subscriber", () => {
    const snap = (publish: boolean) => {
      const engine = new SimEngine(pubsubGraph(publish), {
        arrivalRatePerTick: 100,
        tickMs: TICK_MS,
        seed: 9,
      });
      engine.run(300);
      return engine.snapshot();
    };
    const util = (s: ReturnType<typeof snap>, id: string) =>
      s.nodes.find((n) => n.id === id)?.utilization ?? 0;

    const single = snap(false); // only the first edge (subA) carries traffic
    const broadcast = snap(true); // all three subscribers

    expect(util(single, "subB")).toBe(0);
    expect(util(single, "subC")).toBe(0);

    expect(util(broadcast, "subA")).toBeGreaterThan(0);
    expect(util(broadcast, "subB")).toBeGreaterThan(0);
    expect(util(broadcast, "subC")).toBeGreaterThan(0);
    // delivering to three subscribers does ~3x the completed work
    expect(broadcast.qps).toBeGreaterThan(single.qps * 2.5);
  });

  it("stays deterministic with pub-sub", () => {
    const run = () => {
      const engine = new SimEngine(pubsubGraph(true), {
        arrivalRatePerTick: 80,
        tickMs: TICK_MS,
        seed: 17,
      });
      engine.run(250);
      return engine.snapshot();
    };
    const a = run();
    const b = run();
    expect(b.qps).toBe(a.qps);
    expect(b.p99Ms).toBe(a.p99Ms);
    expect(b.errorRate).toBe(a.errorRate);
  });
});
