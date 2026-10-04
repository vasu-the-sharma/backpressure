import { LogoMark } from "@/components/Logo";
import { VerticalIcon } from "@/components/icons";
import { type VerticalStatus, verticals } from "@/content/verticals";
import Link from "next/link";

const STATUS_STYLE: Record<VerticalStatus, { label: string; color: string }> = {
  live: { label: "Live", color: "var(--color-healthy)" },
  beta: { label: "Beta", color: "var(--color-brand-bright)" },
  soon: { label: "Soon", color: "var(--color-fg-subtle)" },
};

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="flex flex-col items-center py-10 text-center sm:py-16">
        <LogoMark size={52} id="bp-hero" className="mb-6" />
        <p className="eyebrow mb-4">The systems design lab</p>
        <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
          See how systems behave <span className="text-brand-bright">under load.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-fg-muted">
          Backpressure is a hands-on lab for large-scale system design. Drive famous systems as live
          models, or design your own and have it graded — all on one deterministic simulator that
          stays directionally honest rather than claiming to be production telemetry.
        </p>
      </section>

      {/* Verticals */}
      <section className="mt-2">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-fg-subtle">
            Where to start
          </h2>
          <span className="tnum text-xs text-fg-subtle">{verticals.length} tools</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {verticals.map((v) => {
            const status = STATUS_STYLE[v.status];
            return (
              <Link
                key={v.slug}
                href={v.href}
                className="card group relative overflow-hidden p-6 outline-none transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_14px_36px_-16px_rgba(110,86,247,0.55)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-ink)]"
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-full w-0.5 origin-top scale-y-0 bg-brand transition-transform duration-200 group-hover:scale-y-100"
                />

                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-edge bg-raised text-brand-bright transition-colors group-hover:border-brand/50 group-hover:bg-brand/10">
                    <VerticalIcon slug={v.slug} size={24} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold tracking-[-0.01em] text-fg transition-colors group-hover:text-brand-bright">
                        {v.name}
                      </h3>
                      <span
                        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider"
                        style={{ color: status.color }}
                      >
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: status.color }}
                        />
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-brand-bright">{v.tagline}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-fg-muted">{v.description}</p>

                <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-bright">
                  {v.cta}
                  <span
                    aria-hidden
                    className="transition-transform duration-150 group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </span>
              </Link>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-fg-subtle">
          More tools are on the way — they'll appear here and in the top nav as they ship.
        </p>
      </section>
    </div>
  );
}
