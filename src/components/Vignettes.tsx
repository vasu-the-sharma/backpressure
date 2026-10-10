import { KindIcon } from "@/components/icons";
import { CheckGlyph } from "@/components/ui";
import type { NodeKind } from "@/sim/types";

/**
 * Small static renders of each product's real UI, used on the landing cards
 * in place of icons. They are built from the same tokens and shapes as the
 * live components, so the preview is what you get.
 */

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      className="relative flex h-44 items-center justify-center overflow-hidden border-b border-line bg-surface-2 px-5"
    >
      {children}
    </div>
  );
}

export function SystemsVignette() {
  const rows: Array<{ kind: NodeKind; label: string; pct: number; tone: string; tag?: string }> = [
    { kind: "gateway", label: "API Gateway", pct: 34, tone: "var(--color-ok)" },
    {
      kind: "service",
      label: "Matching",
      pct: 88,
      tone: "var(--color-warn)",
      tag: "Bottleneck",
    },
    { kind: "cache", label: "Geo Cache", pct: 21, tone: "var(--color-ok)" },
  ];
  return (
    <Frame>
      <ul className="w-full max-w-72 divide-y divide-line rounded-md border border-line-strong bg-surface">
        {rows.map((r) => (
          <li
            key={r.label}
            className={`flex items-center gap-2.5 px-3 py-2 ${r.tag ? "bg-warn/[0.07]" : ""}`}
          >
            <span className="text-fg-3">
              <KindIcon kind={r.kind} size={13} />
            </span>
            <span className="w-20 truncate text-xs text-fg">{r.label}</span>
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-fill-2">
              <span
                className="block h-full rounded-full"
                style={{ width: `${r.pct}%`, background: r.tone }}
              />
            </span>
            <span className="tnum w-8 text-right text-[11px] text-fg-2">{r.pct}%</span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

export function PlaygroundVignette() {
  const chain: Array<{ kind: NodeKind; label: string }> = [
    { kind: "client", label: "Client" },
    { kind: "cache", label: "Cache" },
    { kind: "db", label: "DB ×2" },
  ];
  return (
    <Frame>
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: "radial-gradient(var(--color-line-strong) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />
      <div className="relative flex flex-col items-center gap-4">
        <div className="flex items-center">
          {chain.map((c, i) => (
            <div key={c.label} className="flex items-center">
              {i > 0 && <span className="h-px w-6 bg-fg-3" />}
              <span className="flex items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-xs text-fg">
                <span className="text-fg-3">
                  <KindIcon kind={c.kind} size={12} />
                </span>
                {c.label}
              </span>
            </div>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-ok/30 bg-ok/10 px-2.5 py-1 text-xs text-ok-fg">
          <CheckGlyph size={11} />
          SLO met · p99 415 ms · 0.0% errors
        </span>
      </div>
    </Frame>
  );
}

export function QuizVignette() {
  const options = [
    { text: "Add a cache in front of it", state: "correct" as const },
    { text: "Add more API replicas", state: "idle" as const },
    { text: "Raise the timeout", state: "idle" as const },
  ];
  return (
    <Frame>
      <div className="w-full max-w-72">
        <p className="mb-2 text-xs text-fg-2">The DB is at 100%. What helps reads most?</p>
        <ul className="space-y-1.5">
          {options.map((o, i) => (
            <li
              key={o.text}
              className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
                o.state === "correct"
                  ? "border-ok/40 bg-ok/10 text-fg"
                  : "border-line-strong bg-surface text-fg-2"
              }`}
            >
              <span className="kbd !h-4 !min-w-4 !px-1 !text-[10px]">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{o.text}</span>
              {o.state === "correct" && <CheckGlyph size={11} className="text-ok-fg" />}
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  );
}
