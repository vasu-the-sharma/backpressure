import { SystemIcon } from "@/components/icons";
import { getAllSystems } from "@/content/registry";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Systems",
  description:
    "Drive famous systems under load — send traffic, break a node, scale it, and watch latency, throughput, and the bottleneck respond in real time.",
};

const CAPABILITIES = ["Send traffic", "Break a node", "Scale a tier", "Watch the bottleneck move"];

export default function SystemsIndex() {
  const systems = getAllSystems();

  return (
    <div>
      <section className="mb-12">
        <p className="eyebrow mb-4">Systems</p>
        <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
          See how systems behave <span className="text-brand-bright">under load.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-fg-muted">
          Each system is a live model you can drive. Send traffic, take a node down, scale it, and
          watch latency, throughput, and the bottleneck respond. The numbers come from a simplified
          simulator, so they are directionally honest rather than real telemetry.
        </p>

        <ul className="mt-7 flex flex-wrap gap-2">
          {CAPABILITIES.map((cap) => (
            <li key={cap} className="badge">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-bright" />
              {cap}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-fg-subtle">Catalog</h2>
          <span className="tnum text-xs text-fg-subtle">{systems.length} available</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {systems.map((system) => (
            <Link
              key={system.slug}
              href={`/systems/${system.slug}`}
              className="card group relative overflow-hidden p-5 outline-none transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_12px_32px_-16px_rgba(110,86,247,0.5)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-ink)]"
            >
              <span
                aria-hidden
                className="absolute left-0 top-0 h-full w-0.5 origin-top scale-y-0 bg-brand transition-transform duration-200 group-hover:scale-y-100"
              />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-edge bg-raised text-brand-bright transition-colors group-hover:border-brand/50 group-hover:bg-brand/10">
                    <SystemIcon name={system.icon} size={20} />
                  </span>
                  <h3 className="text-lg font-semibold tracking-[-0.01em] text-fg transition-colors group-hover:text-brand-bright">
                    {system.name}
                  </h3>
                </div>
                <span className="badge shrink-0">{system.category}</span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-fg-muted">{system.blurb}</p>

              <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-bright">
                Open simulator
                <span
                  aria-hidden
                  className="transition-transform duration-150 group-hover:translate-x-0.5"
                >
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
