import type { SystemGraph } from "@/sim/types";

/**
 * The labels along a graph's primary request path: start at the entry and
 * follow each node's first outgoing edge, which is how the engine routes.
 * Used to summarise a system's topology in one line.
 */
export function primaryPathLabels(graph: SystemGraph): string[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const firstEdge = new Map<string, string>();
  for (const e of graph.edges) if (!firstEdge.has(e.from)) firstEdge.set(e.from, e.to);

  const labels: string[] = [];
  const seen = new Set<string>();
  let id: string | undefined = graph.entryId;
  while (id && !seen.has(id)) {
    seen.add(id);
    const node = byId.get(id);
    if (!node) break;
    labels.push(node.label);
    id = firstEdge.get(id);
  }
  return labels;
}
