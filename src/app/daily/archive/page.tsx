import { auth } from "@/auth";
import { Waitlist } from "@/components/daily/Waitlist";
import { Breadcrumbs, ChevronRight } from "@/components/ui";
import { dailyLabelDate, dailyNumberAt } from "@/content/daily/calendar";
import { TEMPLATE_LABEL, getDailyPuzzle } from "@/content/daily/generate";
import { getDb } from "@/db";
import { isAuthConfigured, isDbConfigured } from "@/server/config";
import { solversByDay } from "@/server/daily";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Past daily puzzles" };

/** Past puzzles, newest first. Playing them is a Pro feature; for now, a waitlist. */
export default async function DailyArchivePage() {
  const today = dailyNumberAt(Date.now());
  const days = Array.from({ length: Math.max(0, today - 1) }, (_, i) => today - 1 - i);
  const accounts = isAuthConfigured();
  const session = accounts ? await auth() : null;
  const admin = session?.user?.role === "admin";
  const solvers = accounts && days.length ? await solversByDay(getDb(), 1, today - 1) : null;

  return (
    <div>
      <Breadcrumbs items={[{ label: "Daily", href: "/daily" }, { label: "Past puzzles" }]} />
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Past puzzles</h1>
        <p className="mt-1 text-xs text-fg-3">Every daily so far, newest first.</p>
      </header>

      <section className="panel mb-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p className="text-base font-medium text-fg">
            Past puzzles are part of Backpressure Pro.
          </p>
          <p className="mt-1 text-sm text-fg-2">
            Play any day you missed, against its par and its leaderboard. Pro is coming soon.
          </p>
        </div>
        <div className="sm:w-[22rem] sm:shrink-0">
          {isDbConfigured() ? (
            <Waitlist source="daily-archive" signedIn={Boolean(session?.user?.id)} />
          ) : (
            <p className="text-sm text-fg-3">The waitlist opens soon.</p>
          )}
        </div>
      </section>

      {days.length === 0 ? (
        <p className="text-sm text-fg-2">
          Today is the first puzzle.{" "}
          <Link
            href="/daily"
            className="text-fg underline decoration-line-strong underline-offset-2"
          >
            Play it
          </Link>
          .
        </p>
      ) : (
        <ol className="panel divide-y divide-line">
          {days.map((n) => {
            const p = getDailyPuzzle(n);
            const row = (
              <>
                <span className="tnum w-12 shrink-0 text-sm text-fg-3">#{n}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">{p.challenge.title}</span>
                  <span className="mt-0.5 block text-xs text-fg-3">
                    {dailyLabelDate(n)} · {TEMPLATE_LABEL[p.template]}
                  </span>
                </span>
                <span className="hidden text-right text-xs text-fg-3 sm:block">
                  Par <span className="tnum text-fg-2">{p.par}</span>
                  {solvers && (
                    <>
                      {" · "}
                      <span className="tnum text-fg-2">{solvers.get(n) ?? 0}</span> solved
                    </>
                  )}
                </span>
              </>
            );
            return (
              <li key={n}>
                {admin ? (
                  <Link
                    href={`/daily/${n}`}
                    className="focus-ring pressable pressable-subtle flex items-center gap-4 px-4 py-3 hover:bg-surface-2"
                  >
                    {row}
                    <ChevronRight size={14} className="text-fg-3" />
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 px-4 py-3">
                    {row}
                    <span className="rounded-sm border border-line-strong px-1.5 py-0.5 text-[10px] text-fg-3">
                      Pro
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
