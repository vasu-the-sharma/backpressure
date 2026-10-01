import type { SystemInput } from "@/content/schema";

/**
 * Uber: real-time ride matching. The matching engine is the deliberate
 * bottleneck; the geo cache absorbs the read-heavy driver-location lookups.
 */
export const uber: SystemInput = {
  slug: "uber",
  name: "Uber",
  icon: "car",
  category: "Ride & Transport",
  sla: "99.99% (illustrative)",
  blurb:
    "Real-time ride matching at scale. Drivers stream location constantly, riders request rides, and a matching engine pairs them in milliseconds against a geospatial index.",
  defaultArrivalRatePerTick: 200,
  graph: {
    entryId: "rider-app",
    nodes: [
      {
        id: "rider-app",
        kind: "client",
        label: "Rider App",
        capacityPerTick: 100_000,
        queueMax: 1_000_000,
        baseLatencyMs: 2,
      },
      {
        id: "api-gateway",
        kind: "gateway",
        label: "API Gateway",
        capacityPerTick: 3_000,
        queueMax: 20_000,
        baseLatencyMs: 3,
      },
      {
        id: "lb",
        kind: "lb",
        label: "Load Balancer",
        capacityPerTick: 8_000,
        queueMax: 20_000,
        baseLatencyMs: 1,
      },
      {
        id: "matching",
        kind: "service",
        label: "Matching Engine",
        capacityPerTick: 300,
        queueMax: 2_000,
        baseLatencyMs: 8,
      },
      {
        id: "redis-geo",
        kind: "cache",
        label: "Geo Cache",
        capacityPerTick: 6_000,
        queueMax: 20_000,
        baseLatencyMs: 1,
        cacheHitRatio: 0.95,
      },
      {
        id: "trip-db",
        kind: "db",
        label: "Trip Database",
        capacityPerTick: 1_500,
        queueMax: 10_000,
        baseLatencyMs: 6,
      },
    ],
    edges: [
      { from: "rider-app", to: "api-gateway" },
      { from: "api-gateway", to: "lb" },
      { from: "lb", to: "matching" },
      { from: "matching", to: "redis-geo" },
      { from: "redis-geo", to: "trip-db" },
    ],
  },
  challenge: {
    title: "Geospatial matching under constant location churn",
    bottleneck:
      "Naive distance queries over millions of moving drivers are quadratic and crush a relational database with constant writes.",
    solution:
      "Index driver positions into a hexagonal grid (H3) so a lookup becomes a cheap hash plus its neighbour cells, served from an in-memory geo cache rather than the primary database.",
  },
  tradeoffs: [
    {
      question: "Where do live driver coordinates live?",
      chosen: "In-memory geo cache",
      alternatives: ["Relational spatial index", "Document store with geo index"],
      rationale:
        "Coordinates update every few seconds and expire quickly. Keeping them in memory avoids writing a firehose of updates to durable storage, at the cost of losing them on a cache failure, which is acceptable because they are re-sent constantly.",
    },
    {
      question: "How do location and matching communicate?",
      chosen: "Event stream",
      alternatives: ["Direct synchronous calls"],
      rationale:
        "A stream absorbs traffic spikes and lets surge, analytics, and matching consume the same location events independently. Direct calls would couple their failure domains and amplify spikes into cascading timeouts.",
    },
  ],
  services: [
    {
      component: "Matching Engine",
      tier: "Service",
      stack: ["Go", "H3", "in-memory index"],
      function: "Pairs riders with nearby drivers using the hexagonal spatial index.",
    },
    {
      component: "Geo Cache",
      tier: "Cache",
      stack: ["Redis", "sorted sets"],
      function: "Holds current driver coordinates keyed by hex cell with short TTLs.",
    },
    {
      component: "Trip Database",
      tier: "Database",
      stack: ["PostgreSQL", "sharded"],
      function: "Durable, immutable record of trips, fares, and state transitions.",
    },
  ],
  interview: [
    "Why is a relational spatial query a poor fit for live driver locations, and what replaces it?",
    "What breaks first when ride requests spike 10x, and how does the design absorb it?",
    "Why keep volatile location data out of the durable database entirely?",
  ],
};
