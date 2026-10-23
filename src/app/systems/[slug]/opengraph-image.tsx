import { getSystem } from "@/content/registry";
import { primaryPathLabels } from "@/lib/graph";
import { OG_SIZE, PageCard, ogFonts } from "@/lib/og";
import { ImageResponse } from "next/og";

export const alt = "A Backpressure system: its name and the path a request takes through it";
export const size = OG_SIZE;
export const contentType = "image/png";

/** A system's preview: its name, what it is, and the path a request takes, as on the page. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const system = getSystem(slug);
  const path = system ? primaryPathLabels(system.graph) : [];
  const chips = path.length > 6 ? [...path.slice(0, 5), `+${path.length - 5} more`] : path;
  return new ImageResponse(
    <PageCard
      section="Systems"
      title={system?.name ?? "System"}
      sub={system?.blurb ?? ""}
      chips={chips}
      arrows
      path={`/systems/${slug}`}
    />,
    { ...size, fonts: await ogFonts() },
  );
}
