import type { SystemInput } from "@/content/schema";

/**
 * URL shortener: a deliberately simple, read-dominated system. Included to
 * prove the content schema and engine generalize to the small case, not just
 * the planetary ones. Almost all traffic is cache hits on redirects.
 */
export const urlShortener: SystemInput = {
  slug: "url-shortener",
  name: "URL Shortener",
  icon: "link",
  category: "Web Infrastructure",
  sla: "99.95% (illustrative)",
  blurb:
    "Turn a long URL into a short key and redirect on lookup. Writes are rare, reads are enormous and overwhelmingly cacheable, which makes it a clean study in cache-aside read paths.",
  defaultArrivalRatePerTick: 800,
  graph: {
    entryId: "client",
    nodes: [
      {
        id: "client",
        kind: "client",
        label: "Browser",
        capacityPerTick: 100_000,
        queueMax: 1_000_000,
        baseLatencyMs: 1,
      },
      {
        id: "gateway",
        kind: "gateway",
        label: "Edge / Gateway",
        capacityPerTick: 6_000,
        queueMax: 30_000,
        baseLatencyMs: 2,
      },
      {
        id: "redirect-svc",
        kind: "service",
        label: "Redirect Service",
        capacityPerTick: 2_000,
        queueMax: 10_000,
        baseLatencyMs: 2,
      },
      {
        id: "kv-cache",
        kind: "cache",
        label: "Key Cache",
        capacityPerTick: 10_000,
        queueMax: 40_000,
        baseLatencyMs: 1,
        cacheHitRatio: 0.98,
      },
      {
        id: "kv-db",
        kind: "db",
        label: "Key Store",
        capacityPerTick: 1_500,
        queueMax: 10_000,
        baseLatencyMs: 4,
      },
    ],
    edges: [
      { from: "client", to: "gateway" },
      { from: "gateway", to: "redirect-svc" },
      { from: "redirect-svc", to: "kv-cache" },
      { from: "kv-cache", to: "kv-db" },
    ],
  },
  challenge: {
    title: "Serving a huge read volume without hammering the store",
    bottleneck:
      "Every redirect is a key lookup. Sending all of them to the database would waste its capacity on identical reads.",
    solution:
      "Cache-aside: the redirect service checks the cache first and only falls through to the store on a miss. With a high hit ratio the store sees a small fraction of traffic.",
  },
  interview: [
    "Why is this system read-dominated, and how does that shape the design?",
    "What hit ratio do you need before the database stops being the constraint?",
    "How would you generate short keys without collisions across many writers?",
  ],
};
