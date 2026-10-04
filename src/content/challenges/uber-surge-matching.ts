import { ratePerTickFromRps } from "@/sim/score";
import type { Challenge } from "./schema";

/**
 * Two tiers saturate before the datastore does — the gateway (3,000/tick) and
 * the matching service (2,000/tick) both sit under the ~3,500/tick surge, so the
 * player has to scale both and still shield the database with a geo cache. The
 * bottleneck visibly moves from the gateway to the matcher as replicas are added.
 */
export const uberSurgeMatching: Challenge = {
  slug: "uber-surge-matching",
  company: "Uber",
  category: "Ride & Transport",
  title: "Hold the match rate through a surge",
  prompt:
    "A surge pushes ~35,000 ride requests/sec at the matching path. Riders arrive through the gateway, and a matching engine pairs them against a geospatial index. Keep the tail bounded and errors near zero — the bottleneck moves as you scale, so chase it down.",
  requirements: [
    "Carry ~35,000 requests/sec of offered load",
    "Keep P99 latency within budget",
    "Drop under 1% of requests",
  ],
  palette: ["gateway", "lb", "service", "cache", "db"],
  requiredKinds: ["db"],
  load: { label: "35k rps surge", arrivalRatePerTick: ratePerTickFromRps(35_000), seed: 1 },
  slo: { p99Ms: 700, maxErrorRate: 0.01, minThroughputRps: 33_000 },
  hint: "Two tiers saturate before the database does: the gateway and the matching service. Scale both, and put a geo cache in front of the database so it only sees misses.",
  solution:
    "Client → API Gateway (×2) → Load Balancer → Matching service (×2) → Geo cache → Database. The gateway and the matcher each need a second replica to clear the surge, and the cache serves ~90% of lookups so the database only handles the misses.",
};
