import { Simulator } from "@/components/Simulator";
import { SystemIcon } from "@/components/icons";
import { Breadcrumbs, CheckGlyph, SectionHeader } from "@/components/ui";
import { getAllSlugs, getSystem } from "@/content/registry";
import type { Metadata } from "next";
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

export default async function SystemPage({ params }: PageProps) {
  const { slug } = await params;
  const system = getSystem(slug);
  if (!system) notFound();

  return (
    <article>
      <Breadcrumbs items={[{ label: "Systems", href: "/systems" }, { label: system.name }]} />

      <header className="mb-6 flex items-start gap-4">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line-strong bg-surface-2 text-fg-2">
          <SystemIcon name={system.icon} size={20} />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{system.name}</h1>
          <p className="mt-1 text-xs text-fg-3">
            {system.category}
            {system.sla && <> · SLA {system.sla}</>} · {system.graph.nodes.length} nodes
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fg-2">{system.blurb}</p>
        </div>
      </header>

      <Simulator
        graph={system.graph}
        defaultArrivalRatePerTick={system.defaultArrivalRatePerTick}
      />
      <p className="mt-2 text-xs text-fg-3">
        Try: raise traffic until something drops, then scale only the bottleneck and watch where the
        limit moves next. Or break a node and see what its neighbours do.
      </p>

      <div className="mt-14 space-y-14">
        {system.challenge && (
          <section aria-labelledby="challenge">
            <SectionHeader id="challenge" title={system.challenge.title} />
            <div className="panel grid md:grid-cols-2">
              <div className="border-b border-line p-5 md:border-r md:border-b-0">
                <p className="flex items-center gap-1.5 text-xs font-medium text-warn-fg">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warn" />
                  The bottleneck
                </p>
                <p className="mt-2 text-sm leading-relaxed text-fg-2">
                  {system.challenge.bottleneck}
                </p>
              </div>
              <div className="p-5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-ok-fg">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ok" />
                  The approach
                </p>
                <p className="mt-2 text-sm leading-relaxed text-fg-2">
                  {system.challenge.solution}
                </p>
              </div>
            </div>
          </section>
        )}

        {system.tradeoffs && system.tradeoffs.length > 0 && (
          <section aria-labelledby="tradeoffs">
            <SectionHeader
              id="tradeoffs"
              title="Trade-offs"
              aside={`${system.tradeoffs.length} decisions`}
            />
            <ul className="panel divide-y divide-line">
              {system.tradeoffs.map((t) => (
                <li key={t.question} className="grid gap-3 p-5 md:grid-cols-[minmax(0,18rem)_1fr]">
                  <div>
                    <p className="text-sm font-medium text-fg">{t.question}</p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-fg">
                      <CheckGlyph size={11} className="text-ok-fg" />
                      {t.chosen}
                    </p>
                    <p className="mt-1 text-xs text-fg-3">over {t.alternatives.join(", ")}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-fg-2">{t.rationale}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {system.services && system.services.length > 0 && (
          <section aria-labelledby="components">
            <SectionHeader id="components" title="Components" />
            <div className="panel overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-xs text-fg-3">
                    <th scope="col" className="px-5 py-2.5 font-normal">
                      Component
                    </th>
                    <th scope="col" className="px-5 py-2.5 font-normal">
                      Tier
                    </th>
                    <th scope="col" className="px-5 py-2.5 font-normal">
                      Stack
                    </th>
                    <th scope="col" className="px-5 py-2.5 font-normal">
                      Function
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {system.services.map((s) => (
                    <tr key={s.component} className="align-top">
                      <td className="px-5 py-3 text-fg">{s.component}</td>
                      <td className="px-5 py-3 text-fg-2">{s.tier}</td>
                      <td className="tnum px-5 py-3 text-xs leading-5 text-fg-3">
                        {s.stack.join(" · ")}
                      </td>
                      <td className="px-5 py-3 text-fg-2">{s.function}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {system.interview && system.interview.length > 0 && (
          <section aria-labelledby="interview">
            <SectionHeader
              id="interview"
              title="Interview questions"
              description="Answer these out loud, then check your reasoning against the live model."
            />
            <ol className="panel divide-y divide-line">
              {system.interview.map((q, i) => (
                <li key={q} className="flex gap-4 px-5 py-3.5 text-sm leading-relaxed text-fg-2">
                  <span className="tnum shrink-0 pt-px text-xs text-fg-3">
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
