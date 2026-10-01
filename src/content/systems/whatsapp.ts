import type { SystemInput } from "@/content/schema";

/**
 * WhatsApp: high-throughput messaging. The chat service holding the persistent
 * connections is the bottleneck; a session cache fronts the message store.
 */
export const whatsapp: SystemInput = {
  slug: "whatsapp",
  name: "WhatsApp",
  icon: "message",
  category: "Messaging",
  sla: "99.9% (illustrative)",
  blurb:
    "Billions of messages a day over persistent connections. The hard part is holding enormous numbers of long-lived sockets cheaply and fanning messages out with delivery guarantees.",
  defaultArrivalRatePerTick: 250,
  graph: {
    entryId: "client",
    nodes: [
      {
        id: "client",
        kind: "client",
        label: "Mobile App",
        capacityPerTick: 100_000,
        queueMax: 1_000_000,
        baseLatencyMs: 2,
      },
      {
        id: "gateway",
        kind: "gateway",
        label: "Connection Gateway",
        capacityPerTick: 5_000,
        queueMax: 30_000,
        baseLatencyMs: 2,
      },
      {
        id: "chat-svc",
        kind: "service",
        label: "Chat Service",
        capacityPerTick: 400,
        queueMax: 3_000,
        baseLatencyMs: 4,
      },
      {
        id: "session-cache",
        kind: "cache",
        label: "Session Cache",
        capacityPerTick: 8_000,
        queueMax: 30_000,
        baseLatencyMs: 1,
        cacheHitRatio: 0.8,
      },
      {
        id: "msg-db",
        kind: "db",
        label: "Message Store",
        capacityPerTick: 2_000,
        queueMax: 15_000,
        baseLatencyMs: 5,
      },
    ],
    edges: [
      { from: "client", to: "gateway" },
      { from: "gateway", to: "chat-svc" },
      { from: "chat-svc", to: "session-cache" },
      { from: "session-cache", to: "msg-db" },
    ],
  },
  challenge: {
    title: "Holding hundreds of millions of persistent connections",
    bottleneck:
      "A connection per online user means the socket layer, not raw compute, is the scaling wall.",
    solution:
      "A lightweight concurrency model keeps per-connection cost tiny, and a session cache keeps routing and recent state out of the durable message store.",
  },
  interview: [
    "Why do persistent connections, not request volume, set the scaling limit here?",
    "What is the role of the session cache, and what happens on a cache miss?",
    "How would you guarantee a message is delivered exactly once to a device?",
  ],
};
