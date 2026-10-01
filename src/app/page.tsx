import Link from "next/link";
import { getAllSystems } from "@/content/registry";

export default function Home() {
  const systems = getAllSystems();

  return (
    <div>
      <section className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          See how systems behave under load.
        </h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Each system is a live model you can drive. Send traffic, take a node down, scale it,
          and watch latency, throughput, and the bottleneck respond. The numbers come from a
          simplified simulator, so they are directionally honest rather than real telemetry.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {systems.map((system) => (
          <Link
            key={system.slug}
            href={`/products/${system.slug}`}
            className="group rounded-lg border border-[var(--color-edge)] bg-[var(--color-panel)] p-5 transition-colors hover:border-[var(--color-accent)]"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold group-hover:text-[var(--color-accent)]">
                {system.name}
              </h2>
              <span className="text-xs text-slate-500">{system.category}</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">{system.blurb}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
