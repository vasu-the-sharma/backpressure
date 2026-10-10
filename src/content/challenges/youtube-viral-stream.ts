import { ratePerTickFromRps } from "@/sim/score";
import type { Challenge } from "./schema";

/**
 * A bandwidth lesson. Serving video is bound by bytes, not request count:
 * each segment is ~2 MB, and the origin can push only so much per replica —
 * and in this scenario the origin is capped at two replicas (an egress
 * budget), so it cannot simply be scaled out of trouble. Two replicas move
 * ~600 segments/tick against ~2,000 offered, so a bare origin drops ~70%.
 * A CDN serves ~95% of segments at the edge and the origin only sees misses.
 */
export const youtubeViralStream: Challenge = {
  slug: "youtube-viral-stream",
  company: "YouTube",
  category: "Media Streaming",
  title: "Stream a video that just went viral",
  prompt:
    "A video goes viral: ~20,000 segment requests/sec, each about 2 MB. The origin can push only a few GB/s per replica, and your egress budget caps it at two replicas. Design the delivery path so viewers keep streaming.",
  requirements: [
    "Serve ~20,000 segment requests/sec of ~2 MB each",
    "Keep playback start (P99) fast",
    "Drop under 1% of segment requests",
  ],
  palette: ["cdn", "gateway", "lb", "service", "storage"],
  requiredKinds: ["storage"],
  kinds: {
    // 600 MB/tick = 6 GB/s per replica → 300 two-megabyte segments per tick.
    storage: { label: "Video origin", bandwidthPerTick: 600_000_000, maxReplicas: 2 },
    cdn: { label: "CDN edge", cacheHitRatio: 0.95 },
  },
  load: {
    label: "20k segments/s × 2 MB",
    arrivalRatePerTick: ratePerTickFromRps(20_000),
    seed: 1,
    requestBytes: 2_000_000,
  },
  slo: { p99Ms: 400, maxErrorRate: 0.01, minThroughputRps: 19_000 },
  hint: "The origin is limited by bytes, not requests — and you can't scale it past two replicas. Serve the bytes somewhere else, closer to viewers, so the origin only handles what the edge doesn't already have.",
  solution:
    "Client → CDN edge → Service → Video origin. The CDN serves ~95% of segments from the edge, so the origin moves ~100 segments/tick instead of ~2,000 — well inside its 12 GB/s. Scaling the origin can't work here: even uncapped it would need ~7 replicas of egress.",
  calibration: {
    // The trap: a classic request path with the origin scaled to its cap.
    naive: {
      nodes: [
        { id: "lb", kind: "lb" },
        { id: "svc", kind: "service", replicas: 2 },
        { id: "origin", kind: "storage", replicas: 2 },
      ],
      edges: [
        ["client", "lb"],
        ["lb", "svc"],
        ["svc", "origin"],
      ],
    },
    reference: {
      nodes: [
        { id: "cdn", kind: "cdn" },
        { id: "svc", kind: "service" },
        { id: "origin", kind: "storage" },
      ],
      edges: [
        ["client", "cdn"],
        ["cdn", "svc"],
        ["svc", "origin"],
      ],
    },
  },
};
