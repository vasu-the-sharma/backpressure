import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { markSvgDocument } from "@/lib/brand";

/** Shared pieces for link-preview images (next/og). */

export const OG_SIZE = { width: 1200, height: 630 };

export async function ogFonts() {
  const dir = join(process.cwd(), "src/assets/fonts");
  const [semibold, regular] = await Promise.all([
    readFile(join(dir, "Inter-SemiBold.ttf")),
    readFile(join(dir, "Inter-Regular.ttf")),
  ]);
  return [
    { name: "Inter", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
  ];
}

export function markDataUri(fg = "#FFFFFF"): string {
  return `data:image/svg+xml;base64,${Buffer.from(markSvgDocument(fg)).toString("base64")}`;
}

const GREEN = "#22C55E";
const RED = "#EF4444";
const DIM = "#1F1F1F";

/**
 * The daily card: brand and puzzle number on top, a big headline, a run grid
 * on the right, and the puzzle's title and address at the bottom. `runs`
 * empty draws a quiet placeholder grid (the puzzle's own preview).
 */
export function DailyCard({
  n,
  headline,
  sub,
  subColor = "#A1A1A1",
  meta,
  runs,
  title,
}: {
  n: number;
  headline: string;
  sub: string;
  subColor?: string;
  meta?: string;
  runs: boolean[][];
  title: string;
}) {
  const rows = runs.length > 0 ? runs : [0, 1, 2].map(() => [false, false, false]);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#000000",
        padding: 72,
        fontFamily: "Inter",
        color: "#FFFFFF",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* biome-ignore lint/a11y/useAltText: rendered to a PNG with its own alt */}
          <img src={markDataUri()} width={52} height={52} />
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>
            Backpressure Daily
          </div>
        </div>
        <div style={{ fontSize: 30, color: "#6F6F6F" }}>{`#${n}`}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 124, fontWeight: 600, letterSpacing: "-0.045em", lineHeight: 1 }}>
            {headline}
          </div>
          <div style={{ marginTop: 22, fontSize: 40, color: subColor }}>{sub}</div>
          {meta ? (
            <div style={{ marginTop: 14, fontSize: 30, color: "#6F6F6F" }}>{meta}</div>
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.slice(-6).map((row, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid
            <div key={i} style={{ display: "flex", gap: 12 }}>
              {row.map((ok, j) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid
                  key={j}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 10,
                    background: runs.length === 0 ? DIM : ok ? GREEN : RED,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#6F6F6F" }}
      >
        <div>{title}</div>
        <div>backpressure.vercel.app/daily</div>
      </div>
    </div>
  );
}
