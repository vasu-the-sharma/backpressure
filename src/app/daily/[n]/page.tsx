import { auth } from "@/auth";
import { DailyGame } from "@/components/daily/DailyGame";
import { Breadcrumbs } from "@/components/ui";
import { dailyLabelDate, dailyNumberAt } from "@/content/daily/calendar";
import { TEMPLATE_LABEL, getDailyPuzzle } from "@/content/daily/generate";
import { isAuthConfigured } from "@/server/config";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ n: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { n } = await params;
  return { title: `Daily #${n}`, robots: { index: false } };
}

/**
 * A past daily. Admins can replay it (practice: nothing is recorded); for
 * everyone else it is a Pro preview.
 */
export default async function PastDailyPage({ params }: PageProps) {
  const { n: raw } = await params;
  const n = Number(raw);
  const today = dailyNumberAt(Date.now());
  if (!Number.isInteger(n) || n < 1 || n > today) notFound();
  if (n === today) redirect("/daily");

  const puzzle = getDailyPuzzle(n);
  const session = isAuthConfigured() ? await auth() : null;
  const admin = session?.user?.role === "admin";

  return (
    <article>
      <Breadcrumbs
        items={[
          { label: "Daily", href: "/daily" },
          { label: "Past puzzles", href: "/daily/archive" },
          { label: `#${n}` },
        ]}
      />
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Daily <span className="tnum">#{n}</span>: {puzzle.challenge.title}
        </h1>
        <p className="mt-1 text-xs text-fg-3">
          {dailyLabelDate(n)} · {TEMPLATE_LABEL[puzzle.template]} · Par {puzzle.par}
          {admin && " · Practice: runs aren't recorded"}
        </p>
      </header>
      {admin ? (
        <>
          <DailyGame
            n={n}
            par={puzzle.par}
            challenge={puzzle.challenge}
            signedIn
            accountsEnabled
            serverStreak={null}
            serverBest={null}
            practice
          />
          <div aria-hidden className="h-28 lg:hidden" />
        </>
      ) : (
        <section className="panel p-6">
          <p className="text-base font-medium text-fg">This puzzle is part of Backpressure Pro.</p>
          <p className="mt-1 text-sm text-fg-2">
            Today&apos;s puzzle is always free.{" "}
            <Link
              href="/daily/archive"
              className="text-fg underline decoration-line-strong underline-offset-2"
            >
              Join the waitlist
            </Link>{" "}
            to play the archive when Pro opens.
          </p>
          <Link href="/daily" className="btn btn-primary mt-5">
            Play today&apos;s puzzle
          </Link>
        </section>
      )}
    </article>
  );
}
