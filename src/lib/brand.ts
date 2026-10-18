/**
 * The Backpressure mark ("queue depth"), defined once. Four queues rise toward
 * capacity; the last has filled and spills over in amber — the same amber the
 * app uses for a bottleneck. Coordinates are in a 100×100 box (content spans
 * x 4–94, y 6–94). The site logo, favicon, app icons, social image and the
 * files in /public/brand are all drawn from these numbers.
 *
 * Lockup: wordmark "Backpressure" in Inter SemiBold at 0.46 × the mark's box,
 * tracking −2.5%, 0.30 × the box between mark and word, cap height centered.
 */
export const BRAND_AMBER = "#F59E0B";
export const BRAND_INK = "#0B0B0B";

export interface MarkBar {
  x: number;
  y: number;
  height: number;
  /** The overflow cap: drawn in amber, never in the foreground color. */
  overflow?: boolean;
}

export const MARK_BAR_WIDTH = 18;
export const MARK_BAR_RADIUS = 4;
export const MARK_BARS: MarkBar[] = [
  { x: 4, y: 64, height: 30 },
  { x: 28, y: 48, height: 46 },
  { x: 52, y: 32, height: 62 },
  { x: 76, y: 27, height: 67 },
  { x: 76, y: 6, height: 15, overflow: true },
];

export const LOCKUP = { wordScale: 0.46, gapScale: 0.3, tracking: "-0.025em" } as const;

/** The mark as a standalone SVG document, for places that need a data URI. */
export function markSvgDocument(fg: string): string {
  const rects = MARK_BARS.map(
    (b) =>
      `<rect x="${b.x}" y="${b.y}" width="${MARK_BAR_WIDTH}" height="${b.height}" rx="${MARK_BAR_RADIUS}" fill="${
        b.overflow ? BRAND_AMBER : fg
      }"/>`,
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${rects}</svg>`;
}
