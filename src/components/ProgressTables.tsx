import { getAllChallenges } from "@/content/challenges/registry";
import { getQuiz } from "@/content/quizzes/registry";
import { shortDate, timeAgo } from "@/lib/format";
import type { userProgress } from "@/server/progress";
import { CheckGlyph, SectionHeader } from "./ui";

type Progress = NonNullable<Awaited<ReturnType<typeof userProgress>>>;

/** Per-challenge status, recent runs and quiz attempts — shared by /account and the admin user page. */
export function ProgressTables({ progress }: { progress: Progress }) {
  const byChallenge = new Map(progress.perChallenge.map((c) => [c.slug, c]));
  const challenges = getAllChallenges();
  const solved = challenges.filter((c) => (byChallenge.get(c.slug)?.passes ?? 0) > 0).length;

  return (
    <div className="space-y-10">
      <section aria-labelledby="challenges">
        <SectionHeader
          id="challenges"
          title="Playground challenges"
          aside={`${solved} of ${challenges.length} solved`}
        />
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-xs text-fg-3">
                <th scope="col" className="px-4 py-2.5 font-normal">
                  Challenge
                </th>
                <th scope="col" className="px-4 py-2.5 font-normal">
                  Status
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-normal">
                  Runs
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-normal">
                  Best passing p99
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-normal">
                  Last run
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {challenges.map((c) => {
                const s = byChallenge.get(c.slug);
                return (
                  <tr key={c.slug}>
                    <td className="px-4 py-2.5 text-fg">{c.title}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {s && s.passes > 0 ? (
                        <span className="inline-flex items-center gap-1 text-ok-fg">
                          <CheckGlyph size={11} /> Solved
                        </span>
                      ) : s ? (
                        <span className="text-warn-fg">Attempted</span>
                      ) : (
                        <span className="text-fg-3">Not started</span>
                      )}
                    </td>
                    <td className="tnum px-4 py-2.5 text-right text-fg-2">{s?.runs ?? 0}</td>
                    <td className="tnum px-4 py-2.5 text-right text-fg-2">
                      {s?.bestP99Ms != null ? `${s.bestP99Ms} ms` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-fg-3">
                      {s?.lastRunAt ? timeAgo(s.lastRunAt) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="runs">
        <SectionHeader id="runs" title="Recent runs" aside={`Last ${progress.recentRuns.length}`} />
        {progress.recentRuns.length === 0 ? (
          <p className="panel px-4 py-8 text-center text-sm text-fg-3">No Playground runs yet.</p>
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-xs text-fg-3">
                  <th scope="col" className="px-4 py-2.5 font-normal">
                    When
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-normal">
                    Challenge
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-normal">
                    Result
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-normal">
                    p99
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-normal">
                    Errors
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-normal">
                    Nodes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {progress.recentRuns.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 text-xs text-fg-3">{timeAgo(r.createdAt)}</td>
                    <td className="px-4 py-2.5 text-fg">
                      {challenges.find((c) => c.slug === r.challengeSlug)?.title ?? r.challengeSlug}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-xs ${r.passed ? "text-ok-fg" : "text-bad-fg"}`}
                    >
                      {r.passed ? "SLO met" : "SLO missed"}
                    </td>
                    <td className="tnum px-4 py-2.5 text-right text-fg-2">{r.p99Ms} ms</td>
                    <td className="tnum px-4 py-2.5 text-right text-fg-2">
                      {(r.errorRate * 100).toFixed(1)}%
                    </td>
                    <td className="tnum px-4 py-2.5 text-right text-fg-2">{r.nodeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="quizzes">
        <SectionHeader
          id="quizzes"
          title="Quiz attempts"
          aside={`Last ${progress.quizzes.length}`}
        />
        {progress.quizzes.length === 0 ? (
          <p className="panel px-4 py-8 text-center text-sm text-fg-3">No quizzes finished yet.</p>
        ) : (
          <ul className="panel divide-y divide-line">
            {progress.quizzes.map((q) => (
              <li
                key={q.id}
                className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
              >
                <span className="min-w-0 truncate text-fg">
                  {getQuiz(q.quizSlug)?.title ?? q.quizSlug}
                </span>
                <span className="flex shrink-0 items-center gap-4">
                  <span className="tnum text-fg-2">
                    {q.score}/{q.total}
                  </span>
                  <span
                    className="w-24 text-right text-xs text-fg-3"
                    title={shortDate(q.createdAt)}
                  >
                    {timeAgo(q.createdAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
