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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { KindIcon } from "@/components/icons";
import type { Challenge } from "@/content/challenges/schema";
import { NODE_DEFAULTS, makeNode } from "@/sim/defaults";
import { validateDesign } from "@/sim/design";
import { type ScoreResult, scoreDesign } from "@/sim/score";
import type { NodeKind, SystemGraph } from "@/sim/types";
import { createContext, useCallback, useContext, useRef, useState } from "react";

interface DesignData extends Record<string, unknown> {
  kind: NodeKind;
  label: string;
  replicas: number;
  isEntry: boolean;
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
  if (util >= 0.9) return "var(--color-danger)";
  if (isBottleneck) return "var(--color-warn)";
  if (util >= 0.75) return "var(--color-warn)";
  return "var(--color-healthy)";
}

const handleClass =
  "!h-2.5 !w-2.5 !border-2 !border-[var(--color-ink)] !bg-[var(--color-brand-bright)]";

function DesignNodeView({ id, data, selected }: NodeProps<DesignNode>) {
  const { changeReplicas, removeNode } = useContext(ActionsContext);
  const hasResult = typeof data.util === "number";
  const pct = Math.round((data.util ?? 0) * 100);
  const color = utilColor(data.util ?? 0, !!data.isBottleneck);

  return (
    <div
      className="w-[184px] rounded-lg border bg-panel px-3 py-2.5 shadow-[0_6px_18px_-12px_rgba(0,0,0,0.6)] transition-colors"
      style={{
        borderColor: data.isBottleneck
          ? "color-mix(in srgb, var(--color-warn) 55%, transparent)"
          : selected
            ? "var(--color-brand)"
            : "var(--color-edge)",
      }}
    >
      {!data.isEntry && <Handle type="target" position={Position.Left} className={handleClass} />}
      <Handle type="source" position={Position.Right} className={handleClass} />

      <div className="flex items-center gap-2">
        <span className="shrink-0 text-brand-bright">
          <KindIcon kind={data.kind} size={16} />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{data.label}</span>
        {data.replicas > 1 && <span className="replica-pill">×{data.replicas}</span>}
      </div>

      <div className="mt-1 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {data.kind}
        </span>
        {!data.isEntry && (
          <div className="nodrag flex items-center gap-1">
            <button
              type="button"
              onClick={() => changeReplicas(id, -1)}
              className="btn btn-secondary btn-xs !px-1.5 !py-0.5"
              aria-label="Fewer replicas"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => changeReplicas(id, 1)}
              className="btn btn-secondary btn-xs !px-1.5 !py-0.5"
              aria-label="More replicas"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => removeNode(id)}
              className="btn btn-secondary btn-xs btn-break !px-1.5 !py-0.5"
              aria-label="Delete node"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {hasResult && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
            />
          </div>
          <span className="tnum w-9 text-right text-[10px]" style={{ color }}>
            {pct}%
          </span>
        </div>
      )}
      {data.isBottleneck && (
        <span
          className="mt-1 inline-block rounded font-mono text-[9px] font-medium tracking-wider"
          style={{
            color: "var(--color-warn)",
            background: "color-mix(in srgb, var(--color-warn) 14%, transparent)",
            padding: "1px 4px",
          }}
        >
          BOTTLENECK
        </span>
      )}
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

function CanvasInner({ challenge }: { challenge: Challenge }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<DesignNode>([entryNode()]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const counter = useRef(0);

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
      const n = counter.current;
      const id = `${kind}-${n}`;
      setNodes((ns) =>
        ns.concat({
          id,
          type: "design",
          position: { x: 40 + n * 210, y: 170 + (n % 2) * 70 },
          data: { kind, label: NODE_DEFAULTS[kind].label, replicas: 1, isEntry: false },
        }),
      );
    },
    [setNodes, clearScore],
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

  const resetCanvas = useCallback(() => {
    counter.current = 0;
    setNodes([entryNode()]);
    setEdges([]);
    setResult(null);
    setErrors([]);
  }, [setNodes, setEdges]);

  const run = useCallback(() => {
    const graph: SystemGraph = {
      nodes: nodes.map((node) => makeNode(node.data.kind, node.id, node.data.replicas)),
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
  }, [nodes, edges, challenge, setNodes]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="card h-[560px] overflow-hidden">
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
            defaultEdgeOptions={{
              type: "smoothstep",
              style: { stroke: "var(--color-edge-strong)", strokeWidth: 1.5 },
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#212838" />
            <Controls showInteractive={false} />
            <Panel position="top-left">
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-edge bg-ink/85 p-1.5 backdrop-blur">
                <span className="px-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  Add
                </span>
                {challenge.palette.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => addNode(kind)}
                    className="btn btn-secondary btn-xs"
                    title={NODE_DEFAULTS[kind].blurb}
                  >
                    <KindIcon kind={kind} size={13} />
                    {NODE_DEFAULTS[kind].label}
                  </button>
                ))}
              </div>
            </Panel>
          </ReactFlow>
        </ActionsContext.Provider>
      </div>

      <aside className="card flex flex-col gap-4 p-4">
        <div>
          <p className="eyebrow mb-1.5">Objective</p>
          <p className="text-sm leading-relaxed text-fg-muted">{challenge.prompt}</p>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
            Targets
          </p>
          <ul className="space-y-1.5 text-xs text-fg-muted">
            <li className="flex justify-between gap-2">
              <span>P99 latency</span>
              <span className="tnum text-fg">≤ {challenge.slo.p99Ms} ms</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Error rate</span>
              <span className="tnum text-fg">
                ≤ {(challenge.slo.maxErrorRate * 100).toFixed(0)}%
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Throughput</span>
              <span className="tnum text-fg">
                ≥ {challenge.slo.minThroughputRps.toLocaleString()} rps
              </span>
            </li>
          </ul>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={run} className="btn btn-primary flex-1">
            Run design
          </button>
          <button type="button" onClick={resetCanvas} className="btn btn-secondary">
            Reset
          </button>
        </div>

        {errors.length > 0 && (
          <div
            className="rounded-lg border px-3 py-2.5 text-xs"
            style={{
              borderColor: "color-mix(in srgb, var(--color-warn) 45%, transparent)",
              background: "color-mix(in srgb, var(--color-warn) 6%, transparent)",
            }}
          >
            <p className="mb-1 font-medium" style={{ color: "var(--color-warn)" }}>
              Fix before running
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-fg-muted">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {result && <Results result={result} />}

        <button
          type="button"
          onClick={() => setShowHint((s) => !s)}
          className="mt-auto self-start text-xs font-medium text-brand-bright hover:underline"
        >
          {showHint ? "Hide hint" : "Show hint"}
        </button>
        {showHint && challenge.hint && (
          <p className="text-xs leading-relaxed text-fg-subtle">{challenge.hint}</p>
        )}
      </aside>
    </div>
  );
}

function Results({ result }: { result: ScoreResult }) {
  const verdictColor = result.pass ? "var(--color-healthy)" : "var(--color-danger)";
  return (
    <div className="rounded-lg border border-edge bg-raised p-3">
      <div className="flex items-center gap-2">
        <span
          className="flex h-6 items-center rounded px-2 font-mono text-[11px] font-semibold uppercase tracking-wider"
          style={{
            color: verdictColor,
            background: `color-mix(in srgb, ${verdictColor} 14%, transparent)`,
          }}
        >
          {result.pass ? "SLO met" : "SLO missed"}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {result.checks.map((c) => (
          <li key={c.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5">
              <span style={{ color: c.ok ? "var(--color-healthy)" : "var(--color-danger)" }}>
                {c.ok ? "✓" : "✗"}
              </span>
              <span className="text-fg-muted">{c.label}</span>
            </span>
            <span className="tnum text-right">
              <span style={{ color: c.ok ? "var(--color-fg)" : "var(--color-danger)" }}>
                {c.actual}
              </span>
              <span className="text-fg-subtle"> / {c.target}</span>
            </span>
          </li>
        ))}
      </ul>
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
