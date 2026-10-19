import { auth } from "@/auth";
import { Countdown } from "@/components/daily/Countdown";
import { DailyGame } from "@/components/daily/DailyGame";
import { Leaderboard } from "@/components/daily/Leaderboard";
import { dailyLabelDate, dailyNumberAt, dailyStartMs } from "@/content/daily/calendar";
import { TEMPLATE_LABEL, getDailyPuzzle } from "@/content/daily/generate";
import { getDb } from "@/db";
import { isAuthConfigured } from "@/server/config";
import { dailyStandings, dailyStreak } from "@/server/daily";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daily puzzle",
  description:
    "One system design puzzle a day. Meet the targets with the fewest servers, keep your streak, and share your result.",
};

export default async function DailyPage() {
  const n = dailyNumberAt(Date.now());
  const puzzle = getDailyPuzzle(n);
  const accounts = isAuthConfigured();
  const session = accounts ? await auth() : null;
  const userId = session?.user?.id ?? null;
  const [standings, streak] = accounts
    ? await Promise.all([
        dailyStandings(getDb(), n, userId),
        userId ? dailyStreak(getDb(), userId, n) : Promise.resolve(null),
      ])
    : [null, null];

  return (
    <article>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-fg-3">
            {dailyLabelDate(n)} · {TEMPLATE_LABEL[puzzle.template]}
          </p>
          <h1 className="display rise-in mt-2 text-4xl text-fg sm:text-5xl">
            Daily <span className="tnum">#{n}</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-2">
            <span className="text-fg">{puzzle.challenge.title}.</span> Meet the targets with the
            fewest servers. Par is <span className="tnum text-fg">{puzzle.par}</span>.
          </p>
        </div>
        <p className="shrink-0 text-xs text-fg-3">
          Next puzzle in <Countdown to={dailyStartMs(n + 1)} />
        </p>
      </header>

      <DailyGame
        // A new day is a new game: remount so yesterday's design doesn't carry over.
        key={n}
        n={n}
        par={puzzle.par}
        challenge={puzzle.challenge}
        signedIn={Boolean(userId)}
        accountsEnabled={accounts}
        serverStreak={streak}
        serverBest={
          standings?.you ? { servers: standings.you.servers, p99: standings.you.p99Ms } : null
        }
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {standings ? (
          <Leaderboard standings={standings} par={puzzle.par} signedIn={Boolean(userId)} />
        ) : (
          <HowItWorks />
        )}
        <aside className="panel flex flex-col gap-3 p-5">
          <h2 className="text-base font-medium text-fg">Missed a day?</h2>
          <p className="text-sm leading-relaxed text-fg-2">
            Every past puzzle stays playable in Backpressure Pro, with its leaderboard and par.
          </p>
          <Link href="/daily/archive" className="btn btn-secondary mt-auto self-start">
            Browse past puzzles
          </Link>
        </aside>
      </div>
      {/* Phones: room so the page's end isn't hidden under the brief sheet's peek. */}
      <div aria-hidden className="h-28 lg:hidden" />
    </article>
  );
}

function HowItWorks() {
  const steps = [
    ["Build", "Add components and connect them, starting from the Client."],
    ["Run", "The simulator scores your design against today's targets."],
    ["Trim", "Pass with the fewest servers you can. Par is the number to beat."],
    ["Share", "Post your run grid. It shows your path, never your answer."],
  ];
  return (
    <section aria-labelledby="how" className="panel p-5">
      <h2 id="how" className="text-base font-medium text-fg">
        How it works
      </h2>
      <ol className="mt-4 grid gap-4 sm:grid-cols-2">
        {steps.map(([title, body], i) => (
          <li key={title} className="flex gap-3">
            <span className="tnum mt-0.5 text-xs text-fg-3">0{i + 1}</span>
            <span>
              <span className="block text-sm font-medium text-fg">{title}</span>
              <span className="mt-0.5 block text-sm text-fg-2">{body}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
