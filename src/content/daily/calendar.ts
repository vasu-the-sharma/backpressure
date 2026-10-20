/**
 * The daily puzzle's calendar. Everyone plays the same puzzle on the same UTC
 * day, which is what makes one global leaderboard fair. Daily #1 is
 * 19 October 2026.
 */
export const DAILY_EPOCH_MS = Date.UTC(2026, 9, 19);
const DAY_MS = 86_400_000;

/** The puzzle number live at a moment (1 on the first day). */
export function dailyNumberAt(ms: number): number {
  return Math.floor((ms - DAILY_EPOCH_MS) / DAY_MS) + 1;
}

/** Midnight UTC at the start of puzzle `n`'s day. */
export function dailyStartMs(n: number): number {
  return DAILY_EPOCH_MS + (n - 1) * DAY_MS;
}

/** Puzzle `n`'s date as YYYY-MM-DD (UTC). */
export function dailyIsoDate(n: number): string {
  return new Date(dailyStartMs(n)).toISOString().slice(0, 10);
}

/** "Sun 19 Oct": short and unambiguous in any locale's reading. */
export function dailyLabelDate(n: number): string {
  return new Date(dailyStartMs(n)).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
