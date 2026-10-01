import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Simulator } from "@/components/Simulator";
import { getAllSlugs, getSystem } from "@/content/registry";

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

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const system = getSystem(slug);
  if (!system) notFound();

  return (
    <article>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          Systems
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300">{system.name}</span>
      </nav>

      <header className="mb-6">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{system.name}</h1>
          {system.sla && <span className="text-xs text-slate-500">{system.sla}</span>}
        </div>
        <p className="mt-2 max-w-2xl text-slate-400">{system.blurb}</p>
      </header>

      <section className="mb-8">
        <Simulator
          graph={system.graph}
          defaultArrivalRatePerTick={system.defaultArrivalRatePerTick}
        />
      </section>

      {system.challenge && (
        <section className="mb-8">
          <h2 className="mb-2 text-lg font-semibold">{system.challenge.title}</h2>
          <div className="space-y-3 text-sm text-slate-300">
            <p>
              <span className="font-medium text-slate-100">The bottleneck. </span>
              {system.challenge.bottleneck}
            </p>
            <p>
              <span className="font-medium text-slate-100">The approach. </span>
              {system.challenge.solution}
            </p>
          </div>
        </section>
      )}

      {system.tradeoffs && system.tradeoffs.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Trade-offs</h2>
          <div className="space-y-4">
            {system.tradeoffs.map((t) => (
              <div
                key={t.question}
                className="rounded-lg border border-[var(--color-edge)] bg-[var(--color-panel)] p-4"
              >
                <p className="font-medium">{t.question}</p>
                <p className="mt-1 text-sm text-[var(--color-accent)]">Chosen: {t.chosen}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Over: {t.alternatives.join(", ")}
                </p>
                <p className="mt-2 text-sm text-slate-300">{t.rationale}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {system.services && system.services.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Components</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-edge)] text-slate-400">
                  <th className="py-2 pr-4 font-medium">Component</th>
                  <th className="py-2 pr-4 font-medium">Tier</th>
                  <th className="py-2 pr-4 font-medium">Stack</th>
                  <th className="py-2 font-medium">Function</th>
                </tr>
              </thead>
              <tbody>
                {system.services.map((s) => (
                  <tr key={s.component} className="border-b border-[var(--color-edge)]/50">
                    <td className="py-2 pr-4 font-medium">{s.component}</td>
                    <td className="py-2 pr-4 text-slate-400">{s.tier}</td>
                    <td className="py-2 pr-4 text-slate-400">{s.stack.join(", ")}</td>
                    <td className="py-2 text-slate-300">{s.function}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {system.interview && system.interview.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Interview questions</h2>
          <ul className="list-inside list-decimal space-y-2 text-sm text-slate-300">
            {system.interview.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
