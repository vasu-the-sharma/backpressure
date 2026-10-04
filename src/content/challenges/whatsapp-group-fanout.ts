import { ratePerTickFromRps } from "@/sim/score";
import type { Challenge } from "./schema";

/**
 * Fan-out + online-delivery cache. A group message is delivered to every
 * member, so the fan-out service multiplies the rate ~20×: ~1,000 messages/sec
 * becomes ~20,000 deliveries/sec. Writing each delivery durably buries the
 * store (~25% drops). The fix is a delivery cache: online members (~90%) are
 * served from it instantly, so only the offline misses reach the durable store.
 */
export const whatsappGroupFanout: Challenge = {
  slug: "whatsapp-group-fanout",
  company: "WhatsApp",
  category: "Messaging",
  title: "Deliver a group message to everyone",
  prompt:
    "A group message is delivered to every member. A busy group fans out ~20×, so ~1,000 messages/sec becomes ~20,000 deliveries/sec. Most members are online and can be served from a fast delivery cache; the rest are offline and fall through to a durable store. Design the delivery path so nothing is dropped.",
  requirements: [
    "Deliver ~1,000 group messages/sec, fanned ~20× to members",
    "Serve online members from a fast cache; store the rest durably",
    "Drop under 1% of deliveries",
  ],
  palette: ["gateway", "lb", "service", "queue", "cache", "db"],
  requiredKinds: ["cache", "db"],
  fanoutKind: "service",
  fanoutFactor: 20,
  load: { label: "1k msgs/s ×20", arrivalRatePerTick: ratePerTickFromRps(1000), seed: 1 },
  slo: { p99Ms: 600, maxErrorRate: 0.01, minThroughputRps: 19_000 },
  hint: "The fan-out turns 1,000 messages/sec into ~20,000 deliveries/sec — far too many to write durably one by one. Put a delivery cache in front: online members (~90%) are served from it instantly, and only the offline misses reach the durable store.",
  solution:
    "Client → API Gateway → Fan-out service (×20) → Delivery cache → Message store. The fan-out produces ~20,000 deliveries/sec; the cache serves the ~90% of members who are online, so the durable store only handles the ~10% who are offline — no store scaling required.",
};
