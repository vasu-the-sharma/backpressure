import { SolvedBadge } from "@/components/SolvedBadge";
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
      <section className="mb-12">
        <p className="eyebrow mb-4">Playground · beta</p>
        <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
          Design a system. <span className="text-brand-bright">Then run it.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-fg-muted">
          Pick a scenario, build the architecture on the canvas, and run it against the offered
          load. You pass when the design holds the SLO — the same simulator that drives the system
          catalog grades your work.
        </p>
      </section>

      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-fg-subtle">
          Challenges
        </h2>
        <span className="tnum text-xs text-fg-subtle">{challenges.length} available</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {challenges.map((c) => (
          <Link
            key={c.slug}
            href={`/playground/${c.slug}`}
            className="card group relative overflow-hidden p-5 outline-none transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_12px_32px_-16px_rgba(110,86,247,0.5)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-ink)]"
          >
            <span
              aria-hidden
              className="absolute left-0 top-0 h-full w-0.5 origin-top scale-y-0 bg-brand transition-transform duration-200 group-hover:scale-y-100"
            />
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold tracking-[-0.01em] text-fg transition-colors group-hover:text-brand-bright">
                {c.title}
              </h3>
              <div className="flex shrink-0 items-center gap-2">
                <SolvedBadge slug={c.slug} />
                <span className="badge">{c.company}</span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">{c.prompt}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-bright">
              Open challenge
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
    </div>
  );
}
