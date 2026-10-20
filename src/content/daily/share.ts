/**
 * Sharing a daily result without spoiling it: a grid of runs, one row per
 * run and one square per target (latency, errors, throughput), green when
 * met. It shows the journey to the answer, never the answer itself.
 *
 * The same result travels in a short URL code so a shared link can render
 * its own preview card: `n-servers-p99-streak-grid`, e.g. `3-5-412-4-rgrggrggg`.
 */

export type RunRow = [latency: boolean, errors: boolean, throughput: boolean];

export interface DailyShare {
  n: number;
  servers: number;
  p99: number;
  streak: number;
  runs: RunRow[];
}

/** Runs kept in a share: the last few tell the story. */
export const SHARE_ROWS = 6;

export function encodeShare(s: DailyShare): string {
  const grid = s.runs
    .slice(-SHARE_ROWS)
    .map((r) => r.map((ok) => (ok ? "g" : "r")).join(""))
    .join("");
  return [s.n, s.servers, Math.round(s.p99), s.streak, grid].join("-");
}

export function decodeShare(code: string): DailyShare | null {
  const m = /^(\d{1,5})-(\d{1,3})-(\d{1,6})-(\d{1,4})-((?:[gr]{3}){1,6})$/.exec(code);
  if (!m) return null;
  const [, n, servers, p99, streak, grid] = m;
  const runs: RunRow[] = [];
  for (let i = 0; i < (grid?.length ?? 0); i += 3) {
    const row = grid?.slice(i, i + 3) ?? "";
    runs.push([row[0] === "g", row[1] === "g", row[2] === "g"]);
  }
  const num = Number(n);
  const srv = Number(servers);
  if (num < 1 || srv < 1) return null;
  return { n: num, servers: srv, p99: Number(p99), streak: Number(streak), runs };
}

/** "on par", "1 under par", "2 over par". */
export function parPhrase(servers: number, par: number): string {
  const d = servers - par;
  if (d === 0) return "on par";
  return `${Math.abs(d)} ${d < 0 ? "under" : "over"} par`;
}

/** The text that goes on the clipboard or into the share sheet. */
export function shareText(s: DailyShare, par: number, url: string): string {
  const rows = s.runs.slice(-SHARE_ROWS).map((r) => r.map((ok) => (ok ? "🟩" : "🟥")).join(""));
  const more =
    s.runs.length > SHARE_ROWS ? [`…and ${s.runs.length - SHARE_ROWS} earlier runs`] : [];
  return [
    `Backpressure Daily #${s.n}`,
    `${s.servers} server${s.servers === 1 ? "" : "s"}, ${parPhrase(s.servers, par)} (par ${par})`,
    ...more,
    ...rows,
    s.streak > 1 ? `🔥 ${s.streak}-day streak` : "",
    url,
  ]
    .filter(Boolean)
    .join("\n");
}
