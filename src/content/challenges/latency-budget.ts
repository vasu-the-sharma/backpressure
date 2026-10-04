import { ratePerTickFromRps } from "@/sim/score";
import type { Challenge } from "./schema";

/**
 * A pure latency lesson. Load is modest (~1,000/tick), so every node has spare
 * capacity and nothing drops — the only thing that moves P99 is the number of
 * hops (each hop costs ~1 tick). A full gateway → lb → service → cache → db
 * chain clears the load with zero errors but blows the 300 ms budget; serving
 * straight from the cache in two hops comes in around 100 ms. The extra kinds in
 * the palette are there to tempt over-engineering.
 */
export const latencyBudget: Challenge = {
  slug: "latency-budget",
  company: "URL Shortener",
  category: "Web Infrastructure",
  title: "Redirect inside a tight latency budget",
  prompt:
    "Redirects must feel instant: serve ~10,000 hot lookups/sec from cache within a 300 ms P99. Load is modest, so capacity is not the problem — every extra hop is. Build the shortest path that still serves the reads.",
  requirements: [
    "Serve ~10,000 reads/sec from a hot cache",
    "P99 latency ≤ 300 ms",
    "Drop under 1% of requests",
  ],
  palette: ["cdn", "gateway", "lb", "service", "cache", "db"],
  requiredKinds: ["cache"],
  load: { label: "10k rps hot reads", arrivalRatePerTick: ratePerTickFromRps(10_000), seed: 1 },
  slo: { p99Ms: 300, maxErrorRate: 0.01, minThroughputRps: 9_500 },
  hint: "Each tier adds roughly one hop of latency. A full gateway → LB → service → cache → database chain blows the budget even with zero drops. Serve straight from the cache, with as few hops as you can.",
  solution:
    "Client → Cache. At this load the cache alone has the capacity, and going straight to it keeps the redirect to two hops — well inside the 300 ms budget. Every extra tier here only adds latency.",
};
