import type { DailyStandings } from "@/server/daily";
import Link from "next/link";

/**
 * Today's standings: how many solved it, how many servers people needed
 * (a bar per server count, like a guess distribution), and the top ten.
 */
export function Leaderboard({
  standings,
  par,
  signedIn,
}: {
  standings: DailyStandings;
  par: number;
  signedIn: boolean;
}) {
  const { solvers, distribution, top, you } = standings;
  const most = Math.max(1, ...distribution.map((d) => d.players));

  return (
    <section aria-labelledby="board" className="panel p-5">
      <header className="flex items-baseline justify-between gap-3">
        <h2 id="board" className="text-base font-medium text-fg">
          Today&apos;s leaderboard
        </h2>
        <p className="text-xs text-fg-3">
          <span className="tnum text-fg-2">{solvers.toLocaleString("en-US")}</span> solved
        </p>
      </header>

      {solvers === 0 ? (
        <p className="mt-4 text-sm text-fg-2">
          Nobody has solved today&apos;s puzzle yet. Be first.
        </p>
      ) : (
        <>
          <figure className="mt-5">
            <figcaption className="text-xs text-fg-3">Servers used</figcaption>
            <ul className="mt-2 space-y-1.5">
              {distribution.map((d) => {
                const mine = you?.servers === d.servers;
                return (
                  <li key={d.servers} className="flex items-center gap-3 text-xs">
                    <span className="tnum w-6 text-right text-fg-2">{d.servers}</span>
                    <span className="h-5 flex-1">
                      <span
                        className="dist-bar"
                        data-mine={mine || undefined}
                        data-par={d.servers <= par || undefined}
                        style={{ width: `${Math.max(6, (d.players / most) * 100)}%` }}
                      >
                        <span className="tnum">{d.players}</span>
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </figure>

          <ol className="mt-5 divide-y divide-line border-t border-line">
            {top.map((r) => (
              <li
                key={r.rank}
                className={`flex items-center gap-3 py-2 text-sm ${r.isYou ? "text-fg" : "text-fg-2"}`}
              >
                <span className="tnum w-6 text-xs text-fg-3">{r.rank}</span>
                <span className="min-w-0 flex-1 truncate">
                  {r.name}
                  {r.isYou && <span className="ml-1.5 text-xs text-accent">you</span>}
                </span>
                <span className="tnum text-fg">{r.servers}</span>
                <span className="tnum w-20 text-right text-xs text-fg-3">{r.p99Ms} ms</span>
              </li>
            ))}
          </ol>
          {you && you.rank > top.length && (
            <p className="mt-3 border-t border-line pt-3 text-sm text-fg">
              You&apos;re <span className="tnum">#{you.rank}</span> with{" "}
              <span className="tnum">{you.servers}</span> servers.
            </p>
          )}
        </>
      )}

      {!signedIn && (
        <p className="mt-4 text-xs text-fg-3">
          <Link
            href="/signin?callbackUrl=%2Fdaily"
            className="focus-ring rounded-sm text-fg underline decoration-line-strong underline-offset-2 hover:decoration-fg"
          >
            Sign in
          </Link>{" "}
          to get on the board and keep your streak across devices. The board shows your first name
          and initial.
        </p>
      )}
    </section>
  );
}
