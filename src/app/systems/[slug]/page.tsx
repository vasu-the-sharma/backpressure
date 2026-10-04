import { SectionGlyph } from "@/components/Logo";
import { Simulator } from "@/components/Simulator";
import { SystemIcon } from "@/components/icons";
import { getAllSlugs, getSystem } from "@/content/registry";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): Array<{ slug: string }> {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const system = getSystem(slug);
  if (!system) return {};
  return {
    title: system.name,
    description: system.blurb,
  };
}

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <span className="text-brand-bright">
          <SectionGlyph />
        </span>
        <span className="eyebrow">{kicker}</span>
      </div>
      <h2 className="mt-2 text-xl font-semibold tracking-[-0.01em]">{title}</h2>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const system = getSystem(slug);
  if (!system) notFound();

  return (
    <article>
      <nav className="mb-6 flex items-center gap-2 text-sm text-fg-subtle">
        <Link href="/systems" className="transition-colors hover:text-fg">
          Systems
        </Link>
        <span aria-hidden className="opacity-50">
          /
        </span>
        <span className="text-fg-muted">{system.name}</span>
      </nav>

      <header className="mb-10">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-edge bg-raised text-brand-bright">
            <SystemIcon name={system.icon} size={24} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-3xl font-bold tracking-[-0.02em]">{system.name}</h1>
              <span className="badge">{system.category}</span>
              {system.sla && <span className="badge">{system.sla}</span>}
            </div>
            <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-fg-muted">
              {system.blurb}
            </p>
          </div>
        </div>
      </header>

      <section className="mb-12">
        <SectionHeading kicker="Live model" title="Drive the system" />
        <Simulator
          graph={system.graph}
          defaultArrivalRatePerTick={system.defaultArrivalRatePerTick}
        />
      </section>

      <div className="space-y-12">
        {system.challenge && (
          <section>
            <SectionHeading kicker="The challenge" title={system.challenge.title} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="card p-4">
                <p className="eyebrow mb-2" style={{ color: "var(--color-warn)" }}>
                  The bottleneck
                </p>
                <p className="text-sm leading-relaxed text-fg-muted">
                  {system.challenge.bottleneck}
                </p>
              </div>
              <div className="card p-4">
                <p className="eyebrow mb-2" style={{ color: "var(--color-healthy)" }}>
                  The approach
                </p>
                <p className="text-sm leading-relaxed text-fg-muted">{system.challenge.solution}</p>
              </div>
            </div>
          </section>
        )}

        {system.tradeoffs && system.tradeoffs.length > 0 && (
          <section>
            <SectionHeading kicker="Decisions" title="Trade-offs" />
            <div className="grid gap-3 sm:grid-cols-2">
              {system.tradeoffs.map((t) => (
                <div key={t.question} className="card p-4">
                  <p className="font-medium text-fg">{t.question}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/10 px-2 py-1 font-medium text-brand-bright">
                      <CheckIcon />
                      {t.chosen}
                    </span>
                    <span className="text-fg-subtle">over {t.alternatives.join(", ")}</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-fg-muted">{t.rationale}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {system.services && system.services.length > 0 && (
          <section>
            <SectionHeading kicker="Anatomy" title="Components" />
            <div className="card overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-edge-strong">
                    <th className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
                      Component
                    </th>
                    <th className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
                      Tier
                    </th>
                    <th className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
                      Stack
                    </th>
                    <th className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
                      Function
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {system.services.map((s) => (
                    <tr
                      key={s.component}
                      className="border-b border-edge transition-colors last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 font-medium text-fg">{s.component}</td>
                      <td className="px-4 py-3">
                        <span className="badge">{s.tier}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-fg-subtle">
                        {s.stack.join(" · ")}
                      </td>
                      <td className="px-4 py-3 text-fg-muted">{s.function}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {system.interview && system.interview.length > 0 && (
          <section>
            <SectionHeading kicker="Go deeper" title="Interview questions" />
            <ol className="space-y-3">
              {system.interview.map((q, i) => (
                <li key={q} className="flex gap-3 text-sm leading-relaxed text-fg-muted">
                  <span className="tnum shrink-0 pt-0.5 text-xs font-semibold text-brand-bright">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </article>
  );
}
