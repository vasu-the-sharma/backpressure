"use client";

import {
  type CapacityInput,
  type CapacityPlan,
  DEFAULT_INPUT,
  planCapacity,
  slowdownAt,
} from "@/content/capacity";
import { compactNumber, formatBytes } from "@/lib/format";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Key = keyof CapacityInput;

interface Knob {
  key: Key;
  /** Short name in the URL, so an estimate can be shared as a link. */
  param: string;
  label: string;
  min: number;
  max: number;
  /** Log sliders cover several orders of magnitude; linear ones snap to `step`. */
  scale: "log" | "linear";
  step?: number;
  show: (v: number) => string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

const TRAFFIC: Knob[] = [
  {
    key: "dailyActiveUsers",
    param: "u",
    label: "Daily users",
    min: 1_000,
    max: 1_000_000_000,
    scale: "log",
    show: compactNumber,
  },
  {
    key: "requestsPerUserPerDay",
    param: "r",
    label: "Requests per user",
    min: 1,
    max: 1_000,
    scale: "log",
    show: (v) => `${compactNumber(v)} a day`,
  },
  {
    key: "peakFactor",
    param: "p",
    label: "Busiest hour",
    min: 1,
    max: 10,
    scale: "linear",
    step: 0.5,
    show: (v) => `${v}× average`,
  },
  {
    key: "serverRps",
    param: "s",
    label: "One server handles",
    min: 10,
    max: 100_000,
    scale: "log",
    show: (v) => `${compactNumber(v)} rps`,
  },
  {
    key: "targetUtilisation",
    param: "t",
    label: "Keep servers under",
    min: 0.3,
    max: 0.95,
    scale: "linear",
    step: 0.05,
    show: (v) => `${pct(v)} busy`,
  },
];

const STORAGE: Knob[] = [
  {
    key: "writeShare",
    param: "w",
    label: "Requests that write",
    min: 0,
    max: 1,
    scale: "linear",
    step: 0.01,
    show: pct,
  },
  {
    key: "bytesPerWrite",
    param: "b",
    label: "Size of each write",
    min: 100,
    max: 10_000_000,
    scale: "log",
    show: formatBytes,
  },
];

const KNOBS = [...TRAFFIC, ...STORAGE];
const STEPS = 1000;

/** Slider position (0..STEPS) for a value, and back. Log values round to two significant figures. */
function toPosition(k: Knob, v: number): number {
  const t =
    k.scale === "log"
      ? Math.log(v / k.min) / Math.log(k.max / k.min)
      : (v - k.min) / (k.max - k.min);
  return Math.round(Math.min(1, Math.max(0, t)) * STEPS);
}

function fromPosition(k: Knob, pos: number): number {
  const t = pos / STEPS;
  if (k.scale === "log") return Number((k.min * (k.max / k.min) ** t).toPrecision(2));
  const step = k.step ?? 1;
  return Number((Math.round((k.min + t * (k.max - k.min)) / step) * step).toFixed(4));
}

function clampTo(k: Knob, v: number): number {
  return Math.min(k.max, Math.max(k.min, v));
}

/** Comfortable, tight or overloaded: the colour of the headroom marker, always with its number. */
function tone(utilisation: number): "ok" | "warn" | "bad" {
  return utilisation <= 0.75 ? "ok" : utilisation <= 0.9 ? "warn" : "bad";
}

export function CapacityPlanner() {
  const [input, setInput] = useState<CapacityInput>(DEFAULT_INPUT);

  // Read a shared estimate from the address once, then keep the address in step.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const next = { ...DEFAULT_INPUT };
    for (const k of KNOBS) {
      const raw = Number(q.get(k.param));
      if (q.has(k.param) && Number.isFinite(raw)) next[k.key] = clampTo(k, raw);
    }
    setInput(next);
  }, []);

  const set = (k: Knob, v: number) => {
    const next = { ...input, [k.key]: v };
    setInput(next);
    const q = new URLSearchParams(KNOBS.map((x) => [x.param, String(next[x.key])]));
    window.history.replaceState(null, "", `?${q}`);
  };

  const plan = planCapacity(input);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="traffic" className="panel p-5">
          <h2 id="traffic" className="text-base font-medium text-fg">
            Traffic
          </h2>
          <div className="mt-4 space-y-4">
            {TRAFFIC.map((k) => (
              <KnobRow key={k.key} knob={k} value={input[k.key]} onChange={(v) => set(k, v)} />
            ))}
          </div>
        </section>
        <Results plan={plan} input={input} />
      </div>

      <Headroom plan={plan} />

      <section aria-labelledby="storage" className="panel grid gap-5 p-5 lg:grid-cols-[1fr_22rem]">
        <div>
          <h2 id="storage" className="text-base font-medium text-fg">
            Storage
          </h2>
          <div className="mt-4 space-y-4">
            {STORAGE.map((k) => (
              <KnobRow key={k.key} knob={k} value={input[k.key]} onChange={(v) => set(k, v)} />
            ))}
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-3 self-center lg:grid-cols-1">
          <Stat label="Writes" value={`${compactNumber(Math.round(plan.writesPerSecond))}/s`} />
          <Stat label="New data a day" value={formatBytes(plan.bytesPerDay)} />
          <Stat
            label="A year"
            value={formatBytes(plan.bytesPerYear)}
            note="before replicas and indexes"
          />
        </dl>
      </section>
    </div>
  );
}

function KnobRow({
  knob,
  value,
  onChange,
}: {
  knob: Knob;
  value: number;
  onChange: (v: number) => void;
}) {
  const id = `knob-${knob.param}`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm text-fg-2">
          {knob.label}
        </label>
        <output htmlFor={id} className="tnum text-sm text-fg">
          {knob.show(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={STEPS}
        value={toPosition(knob, value)}
        onChange={(e) => onChange(fromPosition(knob, Number(e.target.value)))}
        aria-valuetext={knob.show(value)}
        className="range mt-2 w-full"
      />
    </div>
  );
}

function Results({ plan, input }: { plan: CapacityPlan; input: CapacityInput }) {
  const full = plan.peakRps / (plan.serversAtFull * input.serverRps);
  return (
    <section aria-labelledby="plan" aria-live="polite" className="panel p-5">
      <h2 id="plan" className="sr-only">
        Plan
      </h2>
      <dl className="flex flex-col gap-4">
        <Stat
          label="Peak load"
          value={`${Math.round(plan.peakRps).toLocaleString("en-US")} rps`}
          note={`${compactNumber(plan.averageRps)} average × ${input.peakFactor}`}
          big
        />
        <Stat
          label="Servers"
          value={plan.servers.toLocaleString("en-US")}
          note={
            plan.serversAtFull < plan.servers
              ? `${plan.serversAtFull.toLocaleString("en-US")} would each be ${pct(full)} busy`
              : undefined
          }
          big
        />
        <Stat
          label="Each server at the peak"
          value={`${pct(plan.utilisation)} busy`}
          note={`${plan.slowdown.toFixed(1)}× an idle server's time`}
        />
      </dl>
    </section>
  );
}

function Stat({
  label,
  value,
  note,
  big = false,
}: {
  label: string;
  value: string;
  note?: string;
  big?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-fg-3">{label}</dt>
      <dd
        className={`tnum mt-0.5 tracking-tight text-fg ${big ? "text-3xl font-semibold" : "text-xl"}`}
      >
        {value}
      </dd>
      {note && <dd className="mt-0.5 text-xs text-fg-3">{note}</dd>}
    </div>
  );
}

/** The chart's width in CSS pixels, so its text stays the same size on any screen. */
function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** The hockey stick: time in the system against how busy the server is. */
function Headroom({ plan }: { plan: CapacityPlan }) {
  const [box, W] = useWidth(640);
  const H = W < 480 ? 190 : 240;
  const pad = { l: 36, r: 22, t: 16, b: 28 };
  const top = 20;
  const x = (u: number) => pad.l + u * (W - pad.l - pad.r);
  const y = (s: number) => pad.t + (1 - (Math.min(s, top) - 1) / (top - 1)) * (H - pad.t - pad.b);
  const curve = Array.from({ length: 191 }, (_, i) => i / 200)
    .map((u, i) => `${i === 0 ? "M" : "L"}${x(u).toFixed(1)},${y(slowdownAt(u)).toFixed(1)}`)
    .join(" ");
  const u = plan.utilisation;
  const s = plan.slowdown;
  const t = tone(u);
  const color = `var(--color-${t})`;

  return (
    <section aria-labelledby="headroom" className="panel p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="headroom" className="text-base font-medium text-fg">
          Why not run at 100%?
        </h2>
        <p className="text-xs text-fg-3">M/M/1 queue model</p>
      </div>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-fg-2">
        Time in a queue grows as 1 ÷ (1 − busy): 2× at 50%, 10× at 90%, 100× at 99%.
      </p>
      <div ref={box} className="mt-4">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="block"
          role="img"
          aria-label={`At ${pct(u)} busy, a request takes ${s.toFixed(1)} times as long as on an idle server.`}
        >
          {[1, 5, 10, 15, 20].map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--color-line)" />
              <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" className="fill-fg-3 text-[11px]">
                {v}×
              </text>
            </g>
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <text key={v} x={x(v)} y={H - 8} textAnchor="middle" className="fill-fg-3 text-[11px]">
              {pct(v)}
            </text>
          ))}
          <path d={curve} fill="none" stroke="var(--color-fg-2)" strokeWidth={2} />
          <g
            style={{ transform: `translate(${x(u)}px, ${y(s)}px)` }}
            className="transition-transform duration-300 ease-[var(--ease-spring)] motion-reduce:transition-none"
          >
            <line x1={0} x2={0} y1={0} y2={H - pad.b - y(s)} stroke={color} strokeDasharray="3 3" />
            <circle r={6} fill={color} />
            {/* Up and to the left, where the curve is flat; outlined so it reads over the grid. */}
            <text
              x={u < 0.3 ? 12 : -12}
              y={-12}
              textAnchor={u < 0.3 ? "start" : "end"}
              className="tnum text-[12px]"
              fill="var(--color-fg)"
              stroke="var(--color-surface)"
              strokeWidth={4}
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              {pct(u)} busy · {s.toFixed(1)}×
            </text>
          </g>
        </svg>
      </div>
      <p className="mt-2 text-xs text-fg-3">
        The simulator shows the same curve when you push a node to its limit.{" "}
        <Link
          href="/systems"
          className="focus-ring rounded-sm text-fg underline decoration-line-strong underline-offset-2"
        >
          Try it on a system
        </Link>
      </p>
    </section>
  );
}
