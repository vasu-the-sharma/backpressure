import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LOCKUP, markSvgDocument } from "@/lib/brand";
import { ImageResponse } from "next/og";

/** The image shown when a Backpressure link is shared (Slack, X, LinkedIn, iMessage…). */
export const alt = "Backpressure — see how systems behave under load";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const fonts = join(process.cwd(), "src/assets/fonts");
  const [semibold, regular] = await Promise.all([
    readFile(join(fonts, "Inter-SemiBold.ttf")),
    readFile(join(fonts, "Inter-Regular.ttf")),
  ]);
  const mark = `data:image/svg+xml;base64,${Buffer.from(markSvgDocument("#FFFFFF")).toString("base64")}`;
  const m = 132;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#000000",
        fontFamily: "Inter",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: m * LOCKUP.gapScale }}>
        {/* biome-ignore lint/a11y/useAltText: rendered to a PNG with its own alt */}
        <img src={mark} width={m} height={m} />
        <div
          style={{
            color: "#FFFFFF",
            fontSize: m * LOCKUP.wordScale,
            fontWeight: 600,
            letterSpacing: "-0.025em",
          }}
        >
          Backpressure
        </div>
      </div>
      <div style={{ marginTop: 40, color: "#8A8A8A", fontSize: 34, fontWeight: 400 }}>
        See how systems behave under load.
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Inter", data: semibold, weight: 600, style: "normal" },
        { name: "Inter", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
