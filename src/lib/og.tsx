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

/** The production host shown at the foot of every card. */
export const OG_HOST = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "backpressure.vercel.app";

/** Cut text to a length a card can hold, at a word boundary. */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

/** Title size that keeps a long name on two lines at most. */
export function titleSize(title: string): number {
  return title.length <= 18 ? 104 : title.length <= 30 ? 84 : 64;
}

/**
 * The card for a system, challenge or quiz page: brand and section on top, the
 * page's title and one line about it, a row of chips (a request path, or the
 * targets to hit), and the page's address at the bottom.
 */
export function PageCard({
  section,
  title,
  sub,
  chips,
  arrows = false,
  path,
}: {
  section: string;
  title: string;
  sub: string;
  chips: string[];
  /** Join the chips with arrows: a request path rather than a list. */
  arrows?: boolean;
  path: string;
}) {
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
            Backpressure
          </div>
        </div>
        <div style={{ fontSize: 28, color: "#6F6F6F" }}>{section}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: titleSize(title),
            fontWeight: 600,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
          }}
        >
          {clip(title, 60)}
        </div>
        <div style={{ marginTop: 20, fontSize: 34, color: "#A1A1A1", lineHeight: 1.3 }}>
          {clip(sub, 110)}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 14,
            marginTop: 40,
          }}
        >
          {chips.map((chip, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a path can repeat a label
            <div key={`${chip}-${i}`} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {arrows && i > 0 ? <div style={{ fontSize: 28, color: "#6F6F6F" }}>→</div> : null}
              <div
                style={{
                  display: "flex",
                  border: "2px solid #333333",
                  borderRadius: 12,
                  padding: "8px 18px",
                  fontSize: 26,
                  color: "#D4D4D4",
                }}
              >
                {chip}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", fontSize: 26, color: "#6F6F6F" }}>{`${OG_HOST}${path}`}</div>
    </div>
  );
}

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
        <div>{`${OG_HOST}/daily`}</div>
      </div>
    </div>
  );
}
