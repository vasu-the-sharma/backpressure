import { getDailyPuzzle } from "@/content/daily/generate";
import { decodeShare, parPhrase } from "@/content/daily/share";
import { DailyCard, OG_SIZE, ogFonts } from "@/lib/og";
import { ImageResponse } from "next/og";

export const alt = "A Backpressure Daily result";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The preview for a shared result: servers, par, streak and the run grid. */
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const s = decodeShare(code);
  const fonts = await ogFonts();
  if (!s) {
    return new ImageResponse(
      <DailyCard n={0} headline="Daily" sub="One system design puzzle a day" runs={[]} title="" />,
      { ...size, fonts },
    );
  }
  const puzzle = getDailyPuzzle(s.n);
  const d = s.servers - puzzle.par;
  return new ImageResponse(
    <DailyCard
      n={s.n}
      headline={`${s.servers} server${s.servers === 1 ? "" : "s"}`}
      sub={`${parPhrase(s.servers, puzzle.par)} · par ${puzzle.par}`}
      subColor={d <= 0 ? "#4ADE80" : "#FBBF24"}
      meta={[
        `p99 ${s.p99.toLocaleString("en-US")} ms`,
        s.streak > 1 ? `${s.streak}-day streak` : "",
      ]
        .filter(Boolean)
        .join(" · ")}
      runs={s.runs}
      title={puzzle.challenge.title}
    />,
    { ...size, fonts },
  );
}
