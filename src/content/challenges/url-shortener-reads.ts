import { ratePerTickFromRps } from "@/sim/score";
import type { Challenge } from "./schema";

/**
 * Teaches the cache-aside read path. A naive client → service → database design
 * buries the database (1,500/tick capacity) under 2,000/tick of reads. The fix
 * is a cache in front of it, plus enough service replicas to keep up.
 *
 * SLO thresholds are calibrated to the engine (hops cost ~1 tick each, so a
 * healthy multi-hop path already sits in the hundreds of ms).
 */
export const urlShortenerReads: Challenge = {
  slug: "url-shortener-reads",
  company: "URL Shortener",
  category: "Web Infrastructure",
  title: "Serve the read path at scale",
  prompt:
    "Short links are looked up far more than they are created. Design the read path to carry ~20,000 lookups/sec with a bounded tail and near-zero errors. Reads are small and highly cacheable.",
  requirements: [
    "Carry ~20,000 reads/sec of offered load",
    "Keep P99 latency within budget as load climbs",
    "Drop under 1% of requests",
  ],
  palette: ["gateway", "lb", "service", "cache", "db"],
  requiredKinds: ["db"],
  load: { label: "20k rps reads", arrivalRatePerTick: ratePerTickFromRps(20_000), seed: 1 },
  slo: { p99Ms: 700, maxErrorRate: 0.01, minThroughputRps: 19_000 },
  hint: "A bare client → service → database path buries the database. Put a cache in front of it, and give the service enough replicas to absorb the offered load.",
  solution:
    "Client → Load Balancer → Service (×2) → Cache → Database. The service needs a second replica to absorb ~20k reads/sec, and the cache serves ~90% of lookups so the database only handles the misses instead of collapsing under the full read load.",
};
