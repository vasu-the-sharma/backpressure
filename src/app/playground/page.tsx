import { SolvedBadge } from "@/components/SolvedBadge";
import { ChevronRight, PageHeader } from "@/components/ui";
import { getAllChallenges } from "@/content/challenges/registry";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Design a system on a canvas, run it against real load, and pass when it holds the SLO.",
};

export default function PlaygroundIndex() {
  const challenges = getAllChallenges();

  return (
    <div>
      <PageHeader
        display
        title="Design it. Run it."
        description="Pick a scenario, build the architecture on a canvas, and run it against the offered load. You pass when the design holds the SLO — graded by the same simulator that drives the catalog."
      />

      <section aria-labelledby="challenges">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="challenges" className="text-base font-medium text-fg">
            Challenges
          </h2>
          <span className="tnum text-xs text-fg-3">{challenges.length} scenarios</span>
        </div>

        {challenges.length === 0 ? (
          <p className="panel px-4 py-10 text-center text-sm text-fg-3">No challenges yet.</p>
        ) : (
          <ol className="panel divide-y divide-line overflow-hidden">
            {challenges.map((c, i) => (
              <li key={c.slug}>
                <Link
                  href={`/playground/${c.slug}`}
                  className="group focus-ring grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-4 gap-y-2 px-4 py-4 transition-colors duration-150 ease-out hover:bg-surface-2 active:bg-fill sm:px-5"
                >
                  <span className="tnum pt-0.5 text-xs text-fg-3">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p className="text-sm font-medium text-fg">{c.title}</p>
                      <p className="text-xs text-fg-3">
                        {c.company} · {c.category}
                      </p>
                    </div>
                    <p className="mt-1 line-clamp-2 max-w-3xl text-sm leading-relaxed text-fg-2">
                      {c.prompt}
                    </p>
                    <p className="tnum mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-3">
                      <span>p99 ≤ {c.slo.p99Ms} ms</span>
                      <span>errors ≤ {(c.slo.maxErrorRate * 100).toFixed(0)}%</span>
                      <span>≥ {c.slo.minThroughputRps.toLocaleString()} rps</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 self-start pt-0.5">
                    <SolvedBadge slug={c.slug} />
                    <ChevronRight
                      size={14}
                      className="text-fg-3 transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-fg"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
