import { dailyNumberAt } from "@/content/daily/calendar";
import { getDailyPuzzle } from "@/content/daily/generate";
import { DailyCard, OG_SIZE, ogFonts } from "@/lib/og";
import { ImageResponse } from "next/og";

export const alt = "Today's Backpressure Daily puzzle";
export const size = OG_SIZE;
export const contentType = "image/png";
// The puzzle changes at midnight UTC; regenerate at most every ten minutes.
export const revalidate = 600;

export default async function Image() {
  const n = dailyNumberAt(Date.now());
  const puzzle = getDailyPuzzle(Math.max(1, n));
  return new ImageResponse(
    <DailyCard
      n={puzzle.number}
      headline={`Par ${puzzle.par}`}
      sub="Meet the targets with the fewest servers."
      meta={puzzle.challenge.load.label}
      runs={[]}
      title={puzzle.challenge.title}
    />,
    { ...size, fonts: await ogFonts() },
  );
}
