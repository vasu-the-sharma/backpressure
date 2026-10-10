import { NODE_DEFAULTS, makeNode } from "@/sim/defaults";
import { validateDesign } from "@/sim/design";
import type { SimNode, SystemGraph } from "@/sim/types";
import type { Challenge, DesignSpec, KindOverride } from "./schema";

export const ENTRY_ID = "client";

/** The scenario override for a kind, or an empty one. */
export function kindOverride(challenge: Challenge, kind: SimNode["kind"]): KindOverride {
  return challenge.kinds?.[kind] ?? {};
}

/** The label a kind wears in this scenario. */
export function kindLabel(challenge: Challenge, kind: SimNode["kind"]): string {
  return kindOverride(challenge, kind).label ?? NODE_DEFAULTS[kind].label;
}

/**
 * Turn a design (as the canvas or a test describes it) into an engine graph,
 * applying the challenge's per-kind behaviour. The canvas and the calibration
 * tests both go through here, so what is tested is exactly what is played.
 */
export function buildDesignGraph(challenge: Challenge, design: DesignSpec): SystemGraph {
  const entry = makeNode("client", ENTRY_ID);
  const nodes: SimNode[] = [entry];

  for (const spec of design.nodes) {
    const o = kindOverride(challenge, spec.kind);
    const replicas = Math.min(spec.replicas ?? 1, o.maxReplicas ?? Number.POSITIVE_INFINITY);
    const node = makeNode(spec.kind, spec.id, replicas, o.fanout ?? 1);
    if (o.label) node.label = o.label;
    if (o.publish) node.publish = true;
    if (o.bandwidthPerTick !== undefined) node.bandwidthPerTick = o.bandwidthPerTick;
    if (o.cacheHitRatio !== undefined) node.cacheHitRatio = o.cacheHitRatio;
    nodes.push(node);
  }

  return {
    nodes,
    edges: design.edges.map(([from, to]) => ({ from, to })),
    entryId: ENTRY_ID,
  };
}

/** Everything that stops a design from being scored, in plain language (empty = valid). */
export function validateChallengeDesign(challenge: Challenge, graph: SystemGraph): string[] {
  const errors = validateDesign(graph, challenge.requiredKinds);
  if (errors.length > 0) return errors;

  for (const node of graph.nodes) {
    const o = kindOverride(challenge, node.kind);
    if (o.publish && o.minSubscribers) {
      const subs = graph.edges.filter((e) => e.from === node.id).length;
      if (subs < o.minSubscribers) {
        errors.push(
          `Connect ${node.label} to at least ${o.minSubscribers} subscribers (it has ${subs}).`,
        );
      }
    }
  }
  return errors;
}
