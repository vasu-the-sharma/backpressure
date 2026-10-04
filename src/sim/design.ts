import { NODE_DEFAULTS } from "./defaults";
import type { NodeKind, SystemGraph } from "./types";

/**
 * The kinds on the primary path from the entry, following the first out-edge at
 * each node (the same walk the engine's `computePath` does). Used to validate
 * that a design routes through the components a challenge requires.
 */
export function pathKinds(graph: SystemGraph): Set<NodeKind> {
  const adjacency = new Map<string, string[]>();
  for (const n of graph.nodes) adjacency.set(n.id, []);
  for (const e of graph.edges) adjacency.get(e.from)?.push(e.to);

  const defById = new Map(graph.nodes.map((n) => [n.id, n]));
  const kinds = new Set<NodeKind>();
  const visited = new Set<string>();
  let current: string | undefined = graph.entryId;
  while (current !== undefined && !visited.has(current)) {
    visited.add(current);
    const def = defById.get(current);
    if (def) kinds.add(def.kind);
    current = adjacency.get(current)?.[0];
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
