import { CtaLink } from "@/components/CtaLink";
import { RunGrid } from "@/components/daily/RunGrid";
import { VerticalIcon } from "@/components/icons";
import { dailyLabelDate, dailyNumberAt } from "@/content/daily/calendar";
import { getDailyPuzzle } from "@/content/daily/generate";
import { decodeShare, parPhrase } from "@/content/daily/share";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ code: string }>;
}

function load(code: string) {
  const s = decodeShare(code);
  if (!s || s.n > dailyNumberAt(Date.now())) return null;
  return { s, puzzle: getDailyPuzzle(s.n) };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const r = load(code);
  if (!r) return {};
  const line = `${r.s.servers} servers, ${parPhrase(r.s.servers, r.puzzle.par)}`;
  return {
    title: `Daily #${r.s.n}: ${line}`,
    description: `${r.puzzle.challenge.title}. Can you meet the targets with fewer servers?`,
    robots: { index: false },
  };
}

/** Where a shared result lands: the result, and the way into today's puzzle. */
export default async function SharedResultPage({ params }: PageProps) {
  const { code } = await params;
  const r = load(code);
  if (!r) notFound();
  const { s, puzzle } = r;
  const today = dailyNumberAt(Date.now());
  const d = s.servers - puzzle.par;

  return (
    <div className="flex flex-col items-center pt-10 pb-6 text-center">
      <p className="text-xs text-fg-3">
        Backpressure Daily <span className="tnum">#{s.n}</span> · {dailyLabelDate(s.n)}
      </p>
      <p className="mt-2 text-sm text-fg-2">{puzzle.challenge.title}</p>

      <div className="panel rise-in mt-8 flex w-full max-w-md flex-col items-center gap-6 px-6 py-8">
        <div>
          <p className="display text-6xl text-fg">
            <span className="tnum">{s.servers}</span> server{s.servers === 1 ? "" : "s"}
          </p>
          <p className={`mt-3 text-base ${d <= 0 ? "text-ok-fg" : "text-warn-fg"}`}>
            {parPhrase(s.servers, puzzle.par)} · par <span className="tnum">{puzzle.par}</span>
          </p>
          <p className="mt-1 text-xs text-fg-3">
            p99 <span className="tnum">{s.p99.toLocaleString("en-US")}</span> ms
            {s.streak > 1 && (
              <>
                {" · "}
                <span className="tnum">{s.streak}</span>-day streak
              </>
            )}
          </p>
        </div>
        <RunGrid runs={s.runs} size={22} />
        <p className="text-xs text-fg-3">Each row is a run: latency, errors, throughput.</p>
      </div>

      <h1 className="display mt-14 max-w-xl text-3xl text-fg sm:text-4xl">
        {s.n === today ? "Can you do it with fewer?" : "A new puzzle is waiting."}
      </h1>
      <p className="mt-3 max-w-md text-sm text-fg-2">
        One system design puzzle a day. Meet the targets with the fewest servers.
      </p>
      <div className="mt-8 w-full max-w-xs sm:w-auto sm:max-w-none">
        <CtaLink
          href="/daily"
          variant="primary"
          icon={<VerticalIcon slug="playground" size={16} />}
        >
          {s.n === today ? "Play this puzzle" : "Play today's puzzle"}
        </CtaLink>
      </div>
    </div>
  );
}
