import type { Quiz } from "./schema";

export const systemDesignInstincts: Quiz = {
  slug: "system-design-instincts",
  title: "System design instincts",
  topic: "Fundamentals",
  blurb:
    "Eight quick calls on load, caching, fan-out, and bottlenecks — the instincts the simulator is built to train.",
  questions: [
    {
      id: "investigate-first",
      scenario: "Your app slows down during a traffic spike, but the error rate stays near zero.",
      prompt: "What should you investigate first?",
      type: "single",
      options: [
        { id: "a", text: "The size of your CSS and JS bundles" },
        { id: "b", text: "Each tier's utilization, to find the one nearing capacity" },
        { id: "c", text: "The DNS resolver" },
        { id: "d", text: "Whether users are on slow Wi-Fi" },
      ],
      correct: ["b"],
      explanation:
        "High latency with low errors means requests are queueing, not failing — a tier is approaching capacity. Find the node whose utilization is near 100%: that's the bottleneck.",
    },
    {
      id: "reduce-db-load",
      scenario: "Reads vastly outnumber writes, and most reads ask for the same few hot keys.",
      prompt: "Which change most reduces load on the primary database?",
      type: "single",
      options: [
        { id: "a", text: "Raise the database connection-pool size" },
        { id: "b", text: "Put a cache in front of it (cache-aside)" },
        { id: "c", text: "Add an API gateway" },
        { id: "d", text: "Switch to a faster JSON library" },
      ],
      correct: ["b"],
      explanation:
        "A cache serving the hot reads means the database only sees misses — the cache-aside read path. That removes most of the read load entirely, rather than just processing it faster.",
    },
    {
      id: "fanout-on-write",
      prompt:
        "A post is written into each follower's timeline at write time (fan-out-on-write). Which statements are true? (Select all)",
      type: "multi",
      options: [
        { id: "a", text: "The write load downstream scales with the follower count" },
        { id: "b", text: "Reads get cheaper because timelines are precomputed" },
        {
          id: "c",
          text: "It's the ideal choice for celebrity accounts with millions of followers",
        },
        { id: "d", text: "A single post can become thousands of downstream writes" },
      ],
      correct: ["a", "b", "d"],
      explanation:
        "Fan-out-on-write amplifies writes by the follower count (so one post → many writes) and precomputes timelines for cheap reads. It breaks down for celebrities — the huge fan-out is why real systems use a hybrid.",
    },
    {
      id: "bottleneck-moves",
      prompt: "You add capacity to the bottleneck tier. What typically happens?",
      type: "single",
      options: [
        { id: "a", text: "The system can now handle unlimited load" },
        { id: "b", text: "The bottleneck moves to the next-most-saturated tier" },
        { id: "c", text: "The bottleneck disappears for good" },
        { id: "d", text: "Tail latency always gets worse" },
      ],
      correct: ["b"],
      explanation:
        "Relieving one tier just shifts the limit to whatever is now the most-utilized component. Chasing that moving bottleneck is the core loop the playground trains.",
    },
    {
      id: "tail-latency",
      prompt:
        "Why does P99 latency climb sharply as a node's utilization approaches 100%, even before it's exceeded?",
      type: "single",
      options: [
        { id: "a", text: "CPUs physically slow down when busy" },
        { id: "b", text: "Bursts build queues, and tail latency grows with queue depth" },
        { id: "c", text: "The network MTU shrinks under load" },
        { id: "d", text: "TLS handshakes take longer" },
      ],
      correct: ["b"],
      explanation:
        "Arrivals are bursty. As utilization nears capacity, queues form during bursts and drain slowly, so the tail (P99) shoots up well before average utilization reaches 1.0.",
    },
    {
      id: "queues",
      prompt:
        "What does a queue between a producer and a slower consumer actually buy you? (Select all)",
      type: "multi",
      options: [
        { id: "a", text: "It absorbs bursts so the consumer isn't overwhelmed instantly" },
        { id: "b", text: "It decouples producer and consumer failure domains" },
        { id: "c", text: "It raises the consumer's sustained throughput" },
        { id: "d", text: "It lets multiple consumers drain the backlog in parallel" },
      ],
      correct: ["a", "b", "d"],
      explanation:
        "A queue buffers bursts, decouples the two sides, and lets you add consumers. It does not raise sustained capacity — if inflow exceeds total consumer throughput, the queue grows unbounded and eventually drops (that's backpressure).",
    },
    {
      id: "cdn",
      prompt: "Why serve static assets and highly cacheable reads from a CDN?",
      type: "single",
      options: [
        { id: "a", text: "CDNs are always cheaper than any origin" },
        {
          id: "b",
          text: "Edge caches serve users from nearby locations, cutting latency and origin load",
        },
        { id: "c", text: "A CDN can replace your database" },
        { id: "d", text: "CDNs encrypt your data for free" },
      ],
      correct: ["b"],
      explanation:
        "A CDN caches content at edge locations close to users, so most requests never reach the origin — lower latency for users and far less load on your servers.",
    },
    {
      id: "honest-model",
      prompt: "In Backpressure's simulator, the numbers are…",
      type: "single",
      options: [
        { id: "a", text: "Real production telemetry from the companies" },
        { id: "b", text: "A simplified, deterministic model that is directionally honest" },
        { id: "c", text: "Random noise for effect" },
        { id: "d", text: "Measured live from your browser" },
      ],
      correct: ["b"],
      explanation:
        "It's a teaching model: deterministic and directionally correct (utilization drives tail latency, outages cascade, bottlenecks move) — not a claim about any company's real numbers.",
    },
  ],
};
