import { NODE_DEFAULTS } from "./defaults";
import type { NodeKind, SystemGraph } from "./types";

/**
 * The kinds a request can reach from the entry: the primary path (first
 * out-edge at each node, the same walk the engine's `computePath` does), plus
 * every subscriber branch of a pub-sub (`publish`) node, since those receive
 * every event too. Used to validate that a design routes through the
 * components a challenge requires.
 */
export function pathKinds(graph: SystemGraph): Set<NodeKind> {
  const adjacency = new Map<string, string[]>();
  for (const n of graph.nodes) adjacency.set(n.id, []);
  for (const e of graph.edges) adjacency.get(e.from)?.push(e.to);

  const defById = new Map(graph.nodes.map((n) => [n.id, n]));
  const kinds = new Set<NodeKind>();
  const visited = new Set<string>();
  const stack: string[] = [graph.entryId];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (visited.has(current)) continue;
    visited.add(current);
    const def = defById.get(current);
    if (def) kinds.add(def.kind);
    const outs = adjacency.get(current) ?? [];
    const next = def?.publish ? outs : outs.slice(0, 1);
    for (const id of next) stack.push(id);
  }
  return kinds;
}

/** Return human-readable reasons a design can't be scored yet (empty = valid). */
export function validateDesign(graph: SystemGraph, required: NodeKind[] = []): string[] {
  const errors: string[] = [];
  const hasOut = graph.edges.some((e) => e.from === graph.entryId);
  if (!hasOut) {
    errors.push("Connect the Client to the rest of your system.");
    return errors;
  }
  const kinds = pathKinds(graph);
  for (const k of required) {
    if (!kinds.has(k)) {
      errors.push(`Add a ${NODE_DEFAULTS[k].label} on the path from the Client.`);
    }
  }
  return errors;
}
