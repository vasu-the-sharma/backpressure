import { getChallenge } from "@/content/challenges/registry";
import { OG_SIZE, PageCard, ogFonts } from "@/lib/og";
import { ImageResponse } from "next/og";

export const alt = "A Backpressure Playground challenge: the load to carry and the targets to hit";
export const size = OG_SIZE;
export const contentType = "image/png";

const pct = (rate: number) => `${Number((rate * 100).toFixed(2))}%`;

/** A challenge's preview: the brief, the load and the targets. Never the solution. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getChallenge(slug);
  const chips = c
    ? [
        c.load.label,
        `p99 ≤ ${c.slo.p99Ms.toLocaleString("en-US")} ms`,
        `errors ≤ ${pct(c.slo.maxErrorRate)}`,
        `≥ ${c.slo.minThroughputRps.toLocaleString("en-US")} rps`,
      ]
    : [];
  return new ImageResponse(
    <PageCard
      section="Playground challenge"
      title={c?.title ?? "Challenge"}
      sub={c ? `${c.company} · ${c.category}. Design it, then run it under load.` : ""}
      chips={chips}
      path={`/playground/${slug}`}
    />,
    { ...size, fonts: await ogFonts() },
  );
}
