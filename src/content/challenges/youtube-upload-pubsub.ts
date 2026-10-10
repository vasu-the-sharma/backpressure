import { ratePerTickFromRps } from "@/sim/score";
import type { Challenge } from "./schema";

/**
 * A pub-sub lesson. An upload event must reach three independent pipelines
 * (transcoding, search indexing, subscriber notifications), so it goes through
 * a topic that delivers every event to every subscriber. That multiplies the
 * downstream work by the subscriber count: ~600 uploads/tick becomes ~1,800
 * pipeline jobs/tick. Pointing every subscriber at one shared database
 * (1,500/tick) drops ~17%; giving each consumer its own store spreads the load.
 */
export const youtubeUploadPubsub: Challenge = {
  slug: "youtube-upload-pubsub",
  company: "YouTube",
  category: "Media Streaming",
  title: "Fan an upload out to every pipeline",
  prompt:
    "Every upload has to reach three pipelines — transcoding, search indexing, and subscriber notifications — without the upload request waiting on any of them. ~6,000 uploads/sec arrive. Publish each upload to a topic and give every pipeline what it needs.",
  requirements: [
    "Publish ~6,000 uploads/sec to a topic",
    "Deliver every upload to at least 3 subscriber pipelines",
    "Complete ~18,000 pipeline jobs/sec with under 1% dropped",
  ],
  palette: ["gateway", "service", "queue", "db", "storage"],
  requiredKinds: ["queue"],
  kinds: {
    queue: { label: "Upload topic", publish: true, minSubscribers: 3 },
  },
  load: {
    label: "6k uploads/s → 3 pipelines",
    arrivalRatePerTick: ratePerTickFromRps(6_000),
    seed: 1,
  },
  slo: { p99Ms: 600, maxErrorRate: 0.01, minThroughputRps: 17_000 },
  hint: "A topic delivers every event to every subscriber, so three subscribers means three times the downstream work. Look at what all three pipelines write to.",
  solution:
    "Client → API Gateway → Upload service → Upload topic → { Transcoder → Object storage, Indexer → Database, Notifier → Database }. The topic triples the work into ~18,000 jobs/sec; no single store should take all of it, so each pipeline writes to its own store.",
  calibration: {
    // The trap: three subscribers, one shared store taking 3× the load.
    naive: {
      nodes: [
        { id: "gw", kind: "gateway" },
        { id: "upload", kind: "service" },
        { id: "topic", kind: "queue" },
        { id: "transcode", kind: "service" },
        { id: "index", kind: "service" },
        { id: "notify", kind: "service" },
        { id: "db", kind: "db" },
      ],
      edges: [
        ["client", "gw"],
        ["gw", "upload"],
        ["upload", "topic"],
        ["topic", "transcode"],
        ["topic", "index"],
        ["topic", "notify"],
        ["transcode", "db"],
        ["index", "db"],
        ["notify", "db"],
      ],
    },
    reference: {
      nodes: [
        { id: "gw", kind: "gateway" },
        { id: "upload", kind: "service" },
        { id: "topic", kind: "queue" },
        { id: "transcode", kind: "service" },
        { id: "index", kind: "service" },
        { id: "notify", kind: "service" },
        { id: "blobs", kind: "storage" },
        { id: "search-db", kind: "db" },
        { id: "notify-db", kind: "db" },
      ],
      edges: [
        ["client", "gw"],
        ["gw", "upload"],
        ["upload", "topic"],
        ["topic", "transcode"],
        ["topic", "index"],
        ["topic", "notify"],
        ["transcode", "blobs"],
        ["index", "search-db"],
        ["notify", "notify-db"],
      ],
    },
  },
};
