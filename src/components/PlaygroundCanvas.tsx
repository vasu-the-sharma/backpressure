"use client";

import {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  Handle,
  type Node,
  type NodeProps,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { KindIcon } from "@/components/icons";
import { CheckGlyph, CrossGlyph } from "@/components/ui";
import type { Challenge } from "@/content/challenges/schema";
import { NODE_DEFAULTS, makeNode } from "@/sim/defaults";
import { validateDesign } from "@/sim/design";
import { type ScoreResult, scoreDesign } from "@/sim/score";
import type { NodeKind, SystemGraph } from "@/sim/types";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface DesignData extends Record<string, unknown> {
  kind: NodeKind;
  label: string;
  replicas: number;
  isEntry: boolean;
  /** Fan-out factor baked in by the scenario (>1 means this node amplifies). */
  fanout?: number;
  util?: number;
  isBottleneck?: boolean;
}
type DesignNode = Node<DesignData, "design">;

interface Actions {
  changeReplicas: (id: string, delta: number) => void;
  removeNode: (id: string) => void;
}
const ActionsContext = createContext<Actions>({
  changeReplicas: () => {},
  removeNode: () => {},
});

function utilColor(util: number, isBottleneck: boolean): string {
  if (util >= 0.9) return "var(--color-bad)";
  if (isBottleneck) return "var(--color-warn)";
  if (util >= 0.75) return "var(--color-warn)";
  return "var(--color-ok)";
}

const handleClass =
  "!h-3 !w-3 !border-2 !border-[var(--color-canvas)] !bg-[var(--color-fg-2)] transition-[background-color,transform] duration-150 ease-out hover:!scale-125 hover:!bg-[var(--color-accent)]";

/** Arrange nodes left-to-right by their depth from the entry (a tidy layered layout). */
function layoutGraph(nodes: DesignNode[], edges: Edge[]): DesignNode[] {
  const children = new Map<string, string[]>();
  for (const n of nodes) children.set(n.id, []);
  for (const e of edges) children.get(e.source)?.push(e.target);

  const depth = new Map<string, number>();
  const queue: string[] = [];
  if (nodes.some((n) => n.id === "client")) {
    depth.set("client", 0);
    queue.push("client");
  }
  while (queue.length > 0) {
    const id = queue.shift() as string;
    const d = depth.get(id) ?? 0;
    for (const c of children.get(id) ?? []) {
      if (!depth.has(c)) {
        depth.set(c, d + 1);
        queue.push(c);
      }
    }
  }
  let maxDepth = 0;
  for (const d of depth.values()) maxDepth = Math.max(maxDepth, d);
  for (const n of nodes) if (!depth.has(n.id)) depth.set(n.id, maxDepth + 1);

  const rowByDepth = new Map<number, number>();
  return nodes.map((n) => {
    const d = depth.get(n.id) ?? 0;
    const row = rowByDepth.get(d) ?? 0;
    rowByDepth.set(d, row + 1);
    return { ...n, position: { x: 40 + d * 240, y: 110 + row * 150 } };
  });
}

function DesignNodeView({ id, data, selected }: NodeProps<DesignNode>) {
  const { changeReplicas, removeNode } = useContext(ActionsContext);
  const hasResult = typeof data.util === "number";
  const pct = Math.round((data.util ?? 0) * 100);
  const color = utilColor(data.util ?? 0, !!data.isBottleneck);

  return (
    <div
      className="w-[188px] rounded-md border bg-surface px-3 py-2.5 transition-colors duration-150 ease-out"
      style={{
        borderColor: data.isBottleneck
          ? "color-mix(in srgb, var(--color-warn) 65%, transparent)"
          : selected
            ? "var(--color-accent)"
            : "var(--color-line-strong)",
      }}
    >
      {!data.isEntry && <Handle type="target" position={Position.Left} className={handleClass} />}
      <Handle type="source" position={Position.Right} className={handleClass} />

      <div className="flex items-center gap-2">
        <span className="shrink-0 text-fg-3">
          <KindIcon kind={data.kind} size={15} />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-fg">{data.label}</span>
        {!data.isEntry && (
          <button
            type="button"
            onClick={() => removeNode(id)}
            className="nodrag btn btn-ghost btn-icon-xs -mr-1 text-fg-3"
            aria-label={`Delete ${data.label}`}
          >
            <CrossGlyph size={10} />
          </button>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-xs text-fg-3">
          {data.isEntry ? "traffic source" : data.kind}
          {data.fanout && data.fanout > 1 && (
            <span className="text-warn-fg" title="Each request this node forwards fans out">
              {" "}
              · fan ×{data.fanout}
            </span>
          )}
        </span>
        {!data.isEntry && (
          <div className="nodrag flex items-center gap-1">
            <button
              type="button"
              onClick={() => changeReplicas(id, -1)}
              disabled={data.replicas <= 1}
              className="btn btn-secondary btn-icon-xs"
              aria-label={`Fewer ${data.label} replicas`}
            >
              −
            </button>
            <span className="tnum w-7 text-center text-xs text-fg">×{data.replicas}</span>
            <button
              type="button"
              onClick={() => changeReplicas(id, 1)}
              className="btn btn-secondary btn-icon-xs"
              aria-label={`More ${data.label} replicas`}
            >
              +
            </button>
          </div>
        )}
      </div>

      {hasResult && !data.isEntry && (
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-fill-2">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
            />
          </div>
          <span className="tnum w-9 text-right text-[11px]" style={{ color }}>
            {pct}%
          </span>
        </div>
      )}
      {data.isBottleneck && <p className="mt-1 text-[11px] font-medium text-warn-fg">Bottleneck</p>}
    </div>
  );
}

const nodeTypes = { design: DesignNodeView };

function entryNode(): DesignNode {
  return {
    id: "client",
    type: "design",
    position: { x: 40, y: 170 },
    deletable: false,
    data: { kind: "client", label: NODE_DEFAULTS.client.label, replicas: 1, isEntry: true },
  };
}

function markSolved(slug: string) {
  try {
    localStorage.setItem(`bp.solved.${slug}`, "1");
  } catch {
    // storage unavailable — the solved badge is a convenience, not required.
  }
}

function CanvasInner({ challenge }: { challenge: Challenge }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<DesignNode>([entryNode()]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const counter = useRef(0);
  const { fitView } = useReactFlow();

  const clearScore = useCallback(() => {
    setResult(null);
    setErrors([]);
    setNodes((ns) =>
      ns.map((n) => ({ ...n, data: { ...n.data, util: undefined, isBottleneck: false } })),
    );
  }, [setNodes]);

  const onConnect = useCallback(
    (c: Connection) => {
      clearScore();
      // One outgoing edge per node, mirroring the engine's primary-path routing.
      setEdges((eds) =>
        addEdge(
          c,
          eds.filter((e) => e.source !== c.source),
        ),
      );
    },
    [setEdges, clearScore],
  );

  const addNode = useCallback(
    (kind: NodeKind) => {
      clearScore();
      counter.current += 1;
      const id = `${kind}-${counter.current}`;
      setNodes((ns) => {
        const maxX = ns.reduce((m, n) => Math.max(m, n.position.x), 0);
        const fanout =
          kind === challenge.fanoutKind && challenge.fanoutFactor
            ? challenge.fanoutFactor
            : undefined;
        return ns.concat({
          id,
          type: "design",
          position: { x: maxX + 240, y: 170 },
          data: { kind, label: NODE_DEFAULTS[kind].label, replicas: 1, isEntry: false, fanout },
        });
      });
    },
    [setNodes, clearScore, challenge],
  );

  const changeReplicas = useCallback(
    (id: string, delta: number) => {
      clearScore();
      setNodes((ns) =>
        ns.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, replicas: Math.max(1, node.data.replicas + delta) } }
            : node,
        ),
      );
    },
    [setNodes, clearScore],
  );

  const removeNode = useCallback(
    (id: string) => {
      clearScore();
      setNodes((ns) => ns.filter((node) => node.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [setNodes, setEdges, clearScore],
  );

  const tidy = useCallback(() => {
    setNodes((ns) => layoutGraph(ns, edges));
    requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }));
  }, [setNodes, edges, fitView]);

  const resetCanvas = useCallback(() => {
    counter.current = 0;
    setNodes([entryNode()]);
    setEdges([]);
    setResult(null);
    setErrors([]);
  }, [setNodes, setEdges]);

  const run = useCallback(() => {
    const graph: SystemGraph = {
      nodes: nodes.map((node) =>
        makeNode(node.data.kind, node.id, node.data.replicas, node.data.fanout ?? 1),
      ),
      edges: edges.map((e) => ({ from: e.source, to: e.target })),
      entryId: "client",
    };
    const problems = validateDesign(graph, challenge.requiredKinds);
    if (problems.length > 0) {
      setErrors(problems);
      setResult(null);
      return;
    }
    setErrors([]);
    const res = scoreDesign(graph, challenge.load, challenge.slo);
    const byId = new Map(res.state.nodes.map((s) => [s.id, s]));
    setNodes((ns) =>
      ns.map((node) => {
        const s = byId.get(node.id);
        return {
          ...node,
          data: {
            ...node.data,
            util: s?.utilization ?? 0,
            isBottleneck: s?.id === res.state.bottleneckId,
          },
        };
      }),
    );
    setResult(res);
    if (res.pass) markSolved(challenge.slug);
  }, [nodes, edges, challenge, setNodes]);

  // ⌘/Ctrl + Enter runs the design from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run]);

  const isEmpty = nodes.length === 1 && edges.length === 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="panel relative h-[620px] overflow-hidden">
        <ActionsContext.Provider value={{ changeReplicas, removeNode }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            colorMode="dark"
            fitView
            fitViewOptions={{ maxZoom: 1 }}
            connectionRadius={30}
            defaultEdgeOptions={{
              type: "smoothstep",
              style: { strokeWidth: 1.5 },
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2a2a2a" />
            <Controls showInteractive={false} />
            <Panel position="top-left" className="!m-3">
              <div className="flex flex-wrap items-center gap-1 rounded-md border border-line-strong bg-surface-2/95 p-1 backdrop-blur-sm">
                <span className="px-2 text-xs text-fg-3">Add</span>
                {challenge.palette.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => addNode(kind)}
                    className="btn btn-ghost btn-sm"
                    title={NODE_DEFAULTS[kind].blurb}
                  >
                    <KindIcon kind={kind} size={13} />
                    {NODE_DEFAULTS[kind].label}
                  </button>
                ))}
                <span aria-hidden className="mx-1 h-4 w-px bg-line-strong" />
                <button
                  type="button"
                  onClick={tidy}
                  disabled={nodes.length < 2}
                  className="btn btn-ghost btn-sm"
                >
                  Tidy
                </button>
              </div>
            </Panel>
          </ReactFlow>
        </ActionsContext.Provider>

        {isEmpty && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4">
            <p className="max-w-md rounded-md border border-line-strong bg-surface-2 px-4 py-3 text-center text-xs leading-relaxed text-fg-2">
              Add a component from the toolbar, then drag from a node&apos;s right edge to the next
              one. Traffic follows each node&apos;s first connection, starting at the Client.
            </p>
          </div>
        )}
      </div>

      <aside
        className="panel flex flex-col self-start overflow-hidden"
        aria-label="Challenge brief"
      >
        <section className="border-b border-line p-4">
          <h2 className="text-xs text-fg-3">Objective</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-fg-2">{challenge.prompt}</p>
          <ul className="mt-3 space-y-1.5">
            {challenge.requirements.map((r) => (
              <li key={r} className="flex gap-2 text-xs leading-relaxed text-fg-2">
                <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-fg-3" />
                {r}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-b border-line p-4">
          <h2 className="text-xs text-fg-3">Targets</h2>
          <dl className="mt-2 space-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-fg-2">P99 latency</dt>
              <dd className="tnum text-fg">≤ {challenge.slo.p99Ms} ms</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-fg-2">Error rate</dt>
              <dd className="tnum text-fg">≤ {(challenge.slo.maxErrorRate * 100).toFixed(0)}%</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-fg-2">Throughput</dt>
              <dd className="tnum text-fg">
                ≥ {challenge.slo.minThroughputRps.toLocaleString()} rps
              </dd>
            </div>
          </dl>
        </section>

        <section className="p-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={run}
              className="btn btn-primary flex-1"
              title="Run design (⌘/Ctrl + Enter)"
            >
              Run design
              <span aria-hidden className="ml-1 text-[11px] font-normal text-black/50">
                ⌘↵
              </span>
            </button>
            <button
              type="button"
              onClick={resetCanvas}
              disabled={isEmpty && !result}
              className="btn btn-secondary"
            >
              Reset
            </button>
          </div>

          {errors.length > 0 && (
            <div
              role="alert"
              className="mt-3 rounded-md border border-warn/40 bg-warn/[0.07] px-3 py-2.5 text-xs"
            >
              <p className="font-medium text-warn-fg">Fix before running</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-fg-2">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {result ? (
            <Results result={result} solution={challenge.solution} />
          ) : (
            errors.length === 0 && (
              <p className="mt-3 text-xs leading-relaxed text-fg-3">
                Run the design to score it against the targets. Each node then shows its
                utilization, and the bottleneck is marked.
              </p>
            )
          )}

          {challenge.hint && (
            <details className="group mt-4 border-t border-line pt-3">
              <summary className="focus-ring cursor-pointer list-none rounded-sm text-xs text-fg-2 transition-colors duration-150 ease-out hover:text-fg [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">Show hint</span>
                <span className="hidden group-open:inline">Hide hint</span>
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-fg-3">{challenge.hint}</p>
            </details>
          )}
        </section>
      </aside>
    </div>
  );
}

function Results({ result, solution }: { result: ScoreResult; solution?: string }) {
  const bottleneck = result.state.nodes.find((n) => n.id === result.state.bottleneckId);
  return (
    <div className="mt-4" aria-live="polite">
      <p
        className={`flex items-center gap-2 text-sm font-medium ${
          result.pass ? "text-ok-fg" : "text-bad-fg"
        }`}
      >
        <span
          aria-hidden
          className={`h-1.5 w-1.5 rounded-full ${result.pass ? "bg-ok" : "bg-bad"}`}
        />
        {result.pass ? "SLO met" : "SLO missed"}
      </p>

      <table className="mt-2 w-full text-xs">
        <tbody className="divide-y divide-line">
          {result.checks.map((c) => (
            <tr key={c.label}>
              <td className="py-1.5 pr-2">
                <span className="inline-flex items-center gap-1.5 text-fg-2">
                  {c.ok ? (
                    <CheckGlyph size={11} className="text-ok-fg" />
                  ) : (
                    <CrossGlyph size={11} className="text-bad-fg" />
                  )}
                  {c.label}
                </span>
              </td>
              <td className="tnum py-1.5 text-right">
                <span className={c.ok ? "text-fg" : "text-bad-fg"}>{c.actual}</span>
                <span className="text-fg-3"> / {c.target}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!result.pass && bottleneck && (
        <p className="mt-3 text-xs leading-relaxed text-fg-2">
          <span className="text-warn-fg">{bottleneck.label}</span> is the bottleneck at{" "}
          <span className="tnum">{Math.round(bottleneck.utilization * 100)}%</span>. Relieve it —
          more replicas, or keep traffic from reaching it — and run again.
        </p>
      )}

      {result.pass && solution && (
        <div className="mt-3 rounded-md border border-line bg-surface-2 p-3">
          <p className="text-xs font-medium text-fg">Reference approach</p>
          <p className="mt-1 text-xs leading-relaxed text-fg-2">{solution}</p>
        </div>
      )}
    </div>
  );
}

export function PlaygroundCanvas({ challenge }: { challenge: Challenge }) {
  return (
    <ReactFlowProvider>
      <CanvasInner challenge={challenge} />
    </ReactFlowProvider>
  );
}
