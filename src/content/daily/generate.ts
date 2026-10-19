import type { Challenge, DesignSpec, KindOverride } from "@/content/challenges/schema";
import { NODE_DEFAULTS } from "@/sim/defaults";
import { mulberry32 } from "@/sim/rng";
import { ratePerTickFromRps } from "@/sim/score";
import type { NodeKind } from "@/sim/types";
import { dailyIsoDate } from "./calendar";

/**
 * The daily puzzle: one scenario a day, generated from the date, where the
 * goal is to meet the targets with the fewest servers (the sum of every
 * component's replicas). Generation is a pure function of the puzzle number,
 * so the page, the server's grader and the tests all see the same puzzle.
 *
 * Par is computed, not searched. The engine's limit is sharp: a component
 * keeps up to ~99% utilization and falls behind past ~101% (see
 * generate.test.ts). So the generator only accepts traffic levels where every
 * component in every candidate design sits clearly on one side of a replica
 * boundary, and then "how many replicas does this need?" is just a ceiling.
 * Par is the cheapest candidate. A sharp player may still find a design the
 * candidates miss and come in under par, which is the fun of it.
 */

export type DailyTemplate = "reads" | "fanout" | "latency" | "media";

export interface DailyPuzzle {
  number: number;
  /** YYYY-MM-DD, UTC. */
  date: string;
  template: DailyTemplate;
  /** A Challenge, so the Playground canvas and grader run it unchanged. */
  challenge: Challenge;
  /** Servers in the cheapest candidate design: the day's target. */
  par: number;
}

export const TEMPLATE_LABEL: Record<DailyTemplate, string> = {
  reads: "Hot reads",
  fanout: "Fan-out writes",
  latency: "Latency budget",
  media: "Media launch",
};

const TEMPLATES: DailyTemplate[] = ["reads", "fanout", "latency", "media"];

/** One component of a candidate design and the requests per tick it must serve. */
interface Stage {
  kind: NodeKind;
  load: number;
  /** Requests one replica serves per tick (bandwidth-bound for media origins). */
  per: number;
}

/** Utilization band around each replica boundary that the generator avoids. */
function margin(per: number, k: number): number {
  return Math.max(0.04, 2.5 / Math.sqrt(per * k));
}

/** True when `load` is clearly under or clearly over every replica boundary. */
function unambiguous(s: Stage): boolean {
  const x = s.load / s.per;
  const k = Math.max(1, Math.round(x));
  return Math.abs(x - k) / k >= margin(s.per, k);
}

/** Replicas a stage needs. Exact for unambiguous loads: k passes, k − 1 does not. */
function replicasFor(s: Stage): number {
  return Math.max(1, Math.ceil(s.load / s.per));
}

function designOf(stages: Stage[]): DesignSpec {
  const nodes = stages.map((s, i) => ({
    id: `${s.kind}-${i + 1}`,
    kind: s.kind,
    replicas: replicasFor(s),
  }));
  const ids = ["client", ...nodes.map((n) => n.id)];
  return { nodes, edges: nodes.map((n, i) => [ids[i] ?? "client", n.id] as [string, string]) };
}

export function serversIn(design: DesignSpec): number {
  return design.nodes.reduce((sum, n) => sum + (n.replicas ?? 1), 0);
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const pct = (f: number) => `${Math.round(f * 1000) / 10}%`;
const per = (kind: NodeKind) => NODE_DEFAULTS[kind].capacityPerTick;

interface Draft {
  title: string;
  prompt: string;
  requirements: string[];
  hint: string;
  palette: NodeKind[];
  requiredKinds: NodeKind[];
  kinds?: Partial<Record<NodeKind, KindOverride>>;
  before?: Array<[NodeKind, NodeKind]>;
  rps: number;
  requestBytes?: number;
  slo: Challenge["slo"];
  /** Designs that pass by construction; par is the cheapest. */
  candidates: Stage[][];
  /** The obvious design that should fail. */
  naive: DesignSpec;
}

type Rng = () => number;
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)] as T;

/**
 * Try traffic levels near a random start until every stage of every candidate
 * is unambiguous. Deterministic for a given rng.
 */
function settle(
  rng: Rng,
  lo: number,
  hi: number,
  step: number,
  build: (rps: number) => Draft | null,
): Draft {
  const slots = Math.floor((hi - lo) / step) + 1;
  const start = Math.floor(rng() * slots);
  for (let i = 0; i < slots; i++) {
    const rps = lo + ((start + i) % slots) * step;
    const d = build(rps);
    if (d?.candidates.every((c) => c.every(unambiguous))) return d;
  }
  throw new Error("No unambiguous traffic level in range");
}

const READS = [
  { title: "Product pages on launch day", noun: "page views" },
  { title: "Profile lookups", noun: "profile reads" },
  { title: "Short-link redirects", noun: "redirects" },
  { title: "Leaderboard reads", noun: "leaderboard reads" },
  { title: "Price checks", noun: "price checks" },
] as const;

function reads(rng: Rng): Draft {
  const flavor = pick(rng, READS);
  const hit = pick(rng, [0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95]);
  // Half the days, every request must be authenticated before it may read
  // the cache, which rules out the cache-in-front design and changes par.
  const apiFirst = rng() < 0.5;
  return settle(rng, 16_000, 44_000, 500, (rps) => {
    const t = rps / 10;
    const miss = t * (1 - hit);
    const candidates: Stage[][] = [
      [
        { kind: "service", load: t, per: per("service") },
        { kind: "db", load: t, per: per("db") },
      ],
      [
        { kind: "service", load: t, per: per("service") },
        { kind: "cache", load: t, per: per("cache") },
        { kind: "db", load: miss, per: per("db") },
      ],
    ];
    if (!apiFirst) {
      candidates.push([
        { kind: "cache", load: t, per: per("cache") },
        { kind: "service", load: miss, per: per("service") },
        { kind: "db", load: miss, per: per("db") },
      ]);
    }
    return {
      title: flavor.title,
      prompt: `${fmt(rps)} ${flavor.noun} a second, and ${pct(hit)} of them ask for the same hot items. ${
        apiFirst
          ? "Every request must be authenticated by your API service before it may touch the cache."
          : "Every request must pass through your API service, and the data lives in the database."
      }`,
      requirements: [
        `Serve ${fmt(rps)} requests a second`,
        "Keep P99 latency under 450 ms",
        "Drop under 1% of requests",
      ],
      hint: "A cache hit ends a request right there. Work out where a cache saves the most servers, and whether it's worth a server at all.",
      palette: ["lb", "service", "cache", "db"],
      requiredKinds: ["service", "db"],
      kinds: { cache: { cacheHitRatio: hit } },
      before: apiFirst ? [["service", "cache"]] : undefined,
      rps,
      slo: { p99Ms: 450, maxErrorRate: 0.01, minThroughputRps: Math.floor(rps * 0.95) },
      candidates,
      naive: designOf([
        { kind: "service", load: 1, per: 1 },
        { kind: "db", load: 1, per: 1 },
      ]),
    };
  });
}

const FANOUT = [
  { title: "Group chat delivery", unit: "messages", each: "member's inbox" },
  { title: "Follower notifications", unit: "posts", each: "follower" },
  { title: "Order events to warehouses", unit: "orders", each: "warehouse" },
] as const;

function fanout(rng: Rng): Draft {
  const flavor = pick(rng, FANOUT);
  const f = pick(rng, [3, 4, 5, 6, 8]);
  return settle(rng, 2_000, 9_000, 250, (rps) => {
    const t = rps / 10;
    const writes = t * f;
    // Keep the database between "needs scaling" and "a sensible number of replicas".
    if (writes < per("db") * 1.1 || writes > per("db") * 5.5) return null;
    return {
      title: flavor.title,
      prompt: `${fmt(rps)} ${flavor.unit} arrive a second, and each becomes ${f} writes, one per ${flavor.each}. The fan-out service makes the copies; every copy lands in the database.`,
      requirements: [
        `Accept ${fmt(rps)} ${flavor.unit} a second`,
        `Complete ${fmt(rps * f)} writes a second`,
        "Keep P99 latency under 350 ms; drop under 1%",
      ],
      hint: "Count the writes, not the messages. The database sees every copy the fan-out service makes.",
      palette: ["lb", "service", "queue", "db"],
      requiredKinds: ["service", "db"],
      kinds: { service: { label: "Fan-out service", fanout: f } },
      rps,
      slo: { p99Ms: 350, maxErrorRate: 0.01, minThroughputRps: Math.floor(rps * f * 0.95) },
      candidates: [
        [
          { kind: "service", load: t, per: per("service") },
          { kind: "db", load: writes, per: per("db") },
        ],
      ],
      naive: designOf([
        { kind: "service", load: 1, per: 1 },
        { kind: "db", load: 1, per: 1 },
      ]),
    };
  });
}

const LATENCY = [
  { title: "Checkout API", noun: "checkouts" },
  { title: "Search-as-you-type", noun: "keystrokes" },
  { title: "Ad auction", noun: "bids" },
  { title: "Payment authorization", noun: "authorizations" },
] as const;

function latency(rng: Rng): Draft {
  const flavor = pick(rng, LATENCY);
  // Below 99%, misses are common enough to set the P99, and a cache's extra
  // hop blows the budget. At 99.5% and up, misses vanish below the P99.
  const hit = pick(rng, [0.9, 0.95, 0.995, 0.998]);
  return settle(rng, 16_000, 40_000, 500, (rps) => {
    const t = rps / 10;
    const miss = t * (1 - hit);
    const candidates: Stage[][] = [
      [
        { kind: "service", load: t, per: per("service") },
        { kind: "db", load: t, per: per("db") },
      ],
    ];
    if (hit >= 0.99) {
      candidates.push([
        { kind: "cache", load: t, per: per("cache") },
        { kind: "service", load: miss, per: per("service") },
        { kind: "db", load: miss, per: per("db") },
      ]);
    }
    return {
      title: flavor.title,
      prompt: `${fmt(rps)} ${flavor.noun} a second, and each must answer within 250 ms at P99. Every component a request passes through adds about 100 ms. ${pct(hit)} of requests repeat a recent answer.`,
      requirements: [
        `Serve ${fmt(rps)} requests a second`,
        "Keep P99 latency under 250 ms",
        "Drop under 1% of requests",
      ],
      hint: "Every hop costs about 100 ms. A cache only pays off if the requests it misses are too rare to show up at P99.",
      palette: ["gateway", "lb", "service", "cache", "db"],
      requiredKinds: ["service", "db"],
      kinds: { cache: { cacheHitRatio: hit } },
      rps,
      slo: { p99Ms: 250, maxErrorRate: 0.01, minThroughputRps: Math.floor(rps * 0.95) },
      candidates,
      naive: designOf([
        { kind: "service", load: 1, per: 1 },
        { kind: "db", load: 1, per: 1 },
      ]),
    };
  });
}

const MEDIA = [
  { title: "Video premiere", unit: "video segments", mb: 2 },
  { title: "Game patch day", unit: "patch chunks", mb: 4 },
  { title: "Podcast episode drop", unit: "audio chunks", mb: 1 },
] as const;

function media(rng: Rng): Draft {
  const flavor = pick(rng, MEDIA);
  const hit = pick(rng, [0.8, 0.85, 0.9, 0.95]);
  // What one origin replica can push, in items per tick (bytes are the limit).
  const originPer = pick(rng, [250, 300, 400, 500]);
  const bytes = flavor.mb * 1_000_000;
  return settle(rng, 8_000, 30_000, 500, (rps) => {
    const t = rps / 10;
    if (t < originPer * 1.2) return null;
    const gbps = (originPer * 10 * bytes) / 1e9;
    return {
      title: flavor.title,
      prompt: `${fmt(rps)} ${flavor.unit} a second, about ${flavor.mb} MB each. One origin replica can push ${gbps.toLocaleString("en-US", { maximumFractionDigits: 1 })} GB/s: bytes, not requests, are the limit. ${pct(hit)} of requests are popular enough to serve from a CDN edge.`,
      requirements: [
        `Serve ${fmt(rps)} requests a second of ~${flavor.mb} MB`,
        "Keep P99 latency under 400 ms",
        "Drop under 1% of requests",
      ],
      hint: "Serving media is bound by bytes. Serve the popular bytes closer to viewers, so the origin only handles what the edge doesn't have.",
      palette: ["cdn", "lb", "service", "storage"],
      requiredKinds: ["storage"],
      kinds: {
        storage: { label: "Origin", bandwidthPerTick: originPer * bytes },
        cdn: { label: "CDN edge", cacheHitRatio: hit },
      },
      rps,
      requestBytes: bytes,
      slo: { p99Ms: 400, maxErrorRate: 0.01, minThroughputRps: Math.floor(rps * 0.95) },
      candidates: [
        [{ kind: "storage", load: t, per: originPer }],
        [
          { kind: "cdn", load: t, per: per("cdn") },
          { kind: "storage", load: t * (1 - hit), per: originPer },
        ],
      ],
      naive: designOf([
        { kind: "service", load: 1, per: 1 },
        { kind: "storage", load: 1, per: 1 },
      ]),
    };
  });
}

const BUILD: Record<DailyTemplate, (rng: Rng) => Draft> = { reads, fanout, latency, media };

/** Each run of four days uses every template once, in a shuffled order. */
function templateFor(n: number): DailyTemplate {
  const cycle = Math.floor((n - 1) / TEMPLATES.length);
  const order = [...TEMPLATES];
  const rng = mulberry32(0x5eed ^ Math.imul(cycle + 1, 2654435761));
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j] as DailyTemplate, order[i] as DailyTemplate];
  }
  return order[(n - 1) % TEMPLATES.length] as DailyTemplate;
}

const cache = new Map<number, DailyPuzzle>();

/** Puzzle `n` (1-based). Pure and memoized. */
export function getDailyPuzzle(n: number): DailyPuzzle {
  const hit = cache.get(n);
  if (hit) return hit;
  if (!Number.isInteger(n) || n < 1) throw new Error(`No daily puzzle #${n}`);

  const template = templateFor(n);
  const d = BUILD[template](mulberry32(Math.imul(n, 2246822519) ^ 0x9e3779b9));
  const designs = d.candidates.map(designOf);
  const best = designs.reduce((a, b) => (serversIn(b) < serversIn(a) ? b : a));

  const puzzle: DailyPuzzle = {
    number: n,
    date: dailyIsoDate(n),
    template,
    par: serversIn(best),
    challenge: {
      slug: `daily-${n}`,
      company: "Daily",
      category: TEMPLATE_LABEL[template],
      title: d.title,
      prompt: d.prompt,
      requirements: d.requirements,
      palette: d.palette,
      requiredKinds: d.requiredKinds,
      kinds: d.kinds,
      before: d.before,
      load: {
        label: `${fmt(d.rps)} rps`,
        arrivalRatePerTick: ratePerTickFromRps(d.rps),
        seed: n,
        requestBytes: d.requestBytes,
      },
      slo: d.slo,
      hint: d.hint,
      calibration: { naive: d.naive, reference: best },
    },
  };
  cache.set(n, puzzle);
  return puzzle;
}

/** Every candidate design for puzzle `n`, cheapest first. Used by the tests. */
export function dailyCandidates(n: number): DesignSpec[] {
  const p = getDailyPuzzle(n);
  const d = BUILD[p.template](mulberry32(Math.imul(n, 2246822519) ^ 0x9e3779b9));
  return d.candidates.map(designOf).sort((a, b) => serversIn(a) - serversIn(b));
}
