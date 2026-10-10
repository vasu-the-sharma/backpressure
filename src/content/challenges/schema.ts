import type { LoadProfile, SloTarget } from "@/sim/score";
import type { NodeKind } from "@/sim/types";

/**
 * How one node kind behaves in a particular scenario, layered over its
 * defaults (`NODE_DEFAULTS`). This is how a challenge turns a generic
 * "service" into a fan-out service, a "queue" into a pub-sub topic, or
 * "storage" into a bandwidth-bound media origin.
 */
export interface KindOverride {
  /** Replace the kind's default label, e.g. "Topic" for a publish queue. */
  label?: string;
  /** Requests emitted downstream per request forwarded (write amplification). */
  fanout?: number;
  /** Deliver every request to ALL outgoing edges (pub-sub topic). Allows multiple out-edges on the canvas. */
  publish?: boolean;
  /** For a publish kind: the fewest subscribers a valid design must connect. */
  minSubscribers?: number;
  /** Bytes one replica can push per tick. Makes the node bandwidth-bound for `load.requestBytes`. */
  bandwidthPerTick?: number;
  /** Override (or add) a cache/CDN hit ratio, 0..1. */
  cacheHitRatio?: number;
  /** Cap on replicas — a budget the player must design around, not scale past. */
  maxReplicas?: number;
}

/** A design as data: what the canvas produces and what calibration tests run. */
export interface DesignSpec {
  /** Nodes besides the implicit `client` entry. */
  nodes: Array<{ id: string; kind: NodeKind; replicas?: number }>;
  /** `[from, to]` pairs; the client's id is `client`. Order matters: the first edge out of a node is its primary path. */
  edges: Array<[string, string]>;
}

/**
 * A playground challenge: a scenario the player designs a system for. The entry
 * `client` node is always provided on the canvas; `palette` lists the kinds the
 * player may add. Authored as typed modules for now; moves to a DB-backed
 * authoring UI per the architecture plan.
 */
export interface Challenge {
  slug: string;
  company: string;
  category: string;
  title: string;
  /** The brief shown to the player. */
  prompt: string;
  requirements: string[];
  /** Node kinds available to add (the client entry is implicit). */
  palette: NodeKind[];
  /** Kinds that must appear on a path from the entry for a valid submission. */
  requiredKinds?: NodeKind[];
  /** Scenario-specific behaviour per kind (fan-out, pub-sub, bandwidth, limits). */
  kinds?: Partial<Record<NodeKind, KindOverride>>;
  load: LoadProfile;
  slo: SloTarget;
  /** Optional nudge, revealed on demand. */
  hint?: string;
  /** The canonical approach, revealed once the design passes. */
  solution?: string;
  /**
   * The lesson, as two runnable designs: the obvious one that should FAIL and
   * the reference that should PASS. Tests enforce both, so an engine or content
   * change can't silently break what a challenge teaches.
   */
  calibration: {
    naive: DesignSpec;
    reference: DesignSpec;
  };
}
