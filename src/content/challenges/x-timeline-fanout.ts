import { ratePerTickFromRps } from "@/sim/score";
import type { Challenge } from "./schema";

/**
 * Fan-out-on-write. A post is written into each follower's home timeline at
 * write time, so the fan-out service multiplies the write rate ~20×: ~1,000
 * posts/sec becomes ~20,000 timeline writes/sec. A single timeline store caps
 * out and drops ~25%; the fix is to provision the store for the amplified rate.
 * A queue smooths bursts but does not fix sustained over-capacity.
 */
export const xTimelineFanout: Challenge = {
  slug: "x-timeline-fanout",
  company: "Twitter / X",
  category: "Social",
  title: "Fan a post out to every follower",
  prompt:
    "On X, a post is written into each follower's home timeline at write time (fan-out-on-write). A hot post fans out ~20×, so ~1,000 posts/sec becomes ~20,000 timeline writes/sec. Design the write path so none of those writes are dropped.",
  requirements: [
    "Absorb ~1,000 posts/sec, fanned ~20× to followers",
    "Deliver the ~20,000 timeline writes/sec (keep drops under 1%)",
    "Keep the write tail bounded",
  ],
  palette: ["gateway", "lb", "service", "queue", "cache", "db"],
  requiredKinds: ["db"],
  kinds: { service: { label: "Fan-out service", fanout: 20 } },
  load: { label: "1k posts/s ×20", arrivalRatePerTick: ratePerTickFromRps(1000), seed: 1 },
  slo: { p99Ms: 500, maxErrorRate: 0.01, minThroughputRps: 19_000 },
  hint: "The fan-out multiplies the write rate 20×. A single timeline store can't absorb ~20,000 writes/sec — provision the store for the amplified rate by scaling it. A queue smooths bursts but won't fix sustained over-capacity.",
  solution:
    "Client → API Gateway → Fan-out service (×20) → Timeline store (×2). The fan-out turns 1,000 posts/sec into ~20,000 writes/sec, so the store needs roughly double capacity to keep up. A queue in front adds burst tolerance but isn't required once the store is sized for the amplified rate.",
  calibration: {
    // The trap: a store sized for posts, not for the amplified timeline writes.
    naive: {
      nodes: [
        { id: "gw", kind: "gateway" },
        { id: "fan", kind: "service" },
        { id: "store", kind: "db" },
      ],
      edges: [
        ["client", "gw"],
        ["gw", "fan"],
        ["fan", "store"],
      ],
    },
    reference: {
      nodes: [
        { id: "gw", kind: "gateway" },
        { id: "fan", kind: "service" },
        { id: "store", kind: "db", replicas: 2 },
      ],
      edges: [
        ["client", "gw"],
        ["gw", "fan"],
        ["fan", "store"],
      ],
    },
  },
};
