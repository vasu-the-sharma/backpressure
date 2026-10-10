import { SystemIcon } from "@/components/icons";
import { ChevronRight, PageHeader } from "@/components/ui";
import { getAllSystems } from "@/content/registry";
import { primaryPathLabels } from "@/lib/graph";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Systems",
  description:
    "Drive famous systems under load — send traffic, break a node, scale it, and watch latency, throughput, and the bottleneck respond in real time.",
};

export default function SystemsIndex() {
  const systems = getAllSystems();

  return (
    <div>
      <PageHeader
        display
        title="Systems"
        description="Each system is a live model you can drive. Send traffic, take a node down, scale a tier, and watch latency, throughput, and the bottleneck respond."
      />

      <section aria-labelledby="catalog">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="catalog" className="text-base font-medium text-fg">
            Catalog
          </h2>
          <span className="tnum text-xs text-fg-3">{systems.length} systems</span>
        </div>

        {systems.length === 0 ? (
          <p className="panel px-4 py-10 text-center text-sm text-fg-3">
            No systems yet. Add one under <code className="tnum">src/content/systems</code>.
          </p>
        ) : (
          <ul className="panel divide-y divide-line overflow-hidden">
            {systems.map((system) => {
              const path = primaryPathLabels(system.graph);
              return (
                <li key={system.slug}>
                  <Link
                    href={`/systems/${system.slug}`}
                    className="group focus-ring grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 transition-colors duration-150 ease-out hover:bg-surface-2 active:bg-fill sm:px-5 md:grid-cols-[auto_minmax(0,14rem)_minmax(0,1fr)_auto]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-md border border-line-strong bg-surface-2 text-fg-2 transition-colors duration-150 ease-out group-hover:text-fg">
                      <SystemIcon name={system.icon} size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">{system.name}</p>
                      <p className="truncate text-xs text-fg-3">
                        {system.category} · {system.graph.nodes.length} nodes
                      </p>
                    </div>
                    <p className="hidden min-w-0 truncate text-xs text-fg-3 md:block">
                      {path.join("  →  ")}
                    </p>
                    <ChevronRight
                      size={14}
                      className="text-fg-3 transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-fg"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
