"use client";

import { type CanvasMode, PlaygroundCanvas } from "@/components/PlaygroundCanvas";
import { RunGrid } from "@/components/daily/RunGrid";
import { CheckGlyph } from "@/components/ui";
import type { Challenge, DesignSpec } from "@/content/challenges/schema";
import { serversIn } from "@/content/daily/generate";
import { type RunRow, encodeShare, parPhrase, shareText } from "@/content/daily/share";
import { streakFrom } from "@/content/daily/streak";
import { type DailySubmitResult, submitDailyRun } from "@/server/actions";
import type { ScoreResult } from "@/sim/score";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

interface Best {
  servers: number;
  p99: number;
}

type Submit = "idle" | "saving" | DailySubmitResult;

const dayKey = (n: number) => `bp.daily.v1.${n}`;
const SOLVED_KEY = "bp.daily.v1.solved";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode): the game still works for this visit.
  }
}

const better = (a: Best, b: Best | null) =>
  !b || a.servers < b.servers || (a.servers === b.servers && a.p99 < b.p99);

/**
 * Today's puzzle on the Playground canvas. Keeps the run history and best
 * result on this device (so the share grid and streak work signed out),
 * submits passing runs to the leaderboard when signed in, and turns the
 * result into a spoiler-free share.
 */
export function DailyGame({
  n,
  par,
  challenge,
  signedIn,
  accountsEnabled,
  serverStreak,
  serverBest,
  practice = false,
}: {
  n: number;
  par: number;
  challenge: Challenge;
  signedIn: boolean;
  accountsEnabled: boolean;
  serverStreak: { current: number; best: number } | null;
  serverBest: Best | null;
  /** A past puzzle played for practice: nothing is submitted or counted. */
  practice?: boolean;
}) {
  const router = useRouter();
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [best, setBest] = useState<Best | null>(serverBest);
  const [solved, setSolved] = useState<number[]>([]);
  const [last, setLast] = useState<{ pass: boolean; servers: number } | null>(null);
  const [submit, setSubmit] = useState<Submit>("idle");
  const [copied, setCopied] = useState(false);

  // This device's history for today, and every day it has solved.
  useEffect(() => {
    const saved = read<{ runs: RunRow[]; best: Best | null }>(dayKey(n), { runs: [], best: null });
    setRuns(saved.runs);
    setBest((b) => (saved.best && better(saved.best, b) ? saved.best : b));
    setSolved(read<number[]>(SOLVED_KEY, []));
  }, [n]);

  const streak = useMemo(
    () =>
      serverStreak ??
      streakFrom(
        [...solved].sort((a, b) => b - a),
        n,
      ),
    [serverStreak, solved, n],
  );

  const onScored = useCallback(
    (design: DesignSpec, res: ScoreResult) => {
      const row: RunRow = [!!res.checks[0]?.ok, !!res.checks[1]?.ok, !!res.checks[2]?.ok];
      const servers = serversIn(design);
      const nextRuns = [...runs, row].slice(-40);
      setRuns(nextRuns);
      setLast({ pass: res.pass, servers });

      let nextBest = best;
      if (res.pass) {
        const candidate = { servers, p99: Math.round(res.state.p99Ms) };
        if (better(candidate, best)) nextBest = candidate;
        if (!practice && !solved.includes(n)) {
          const nextSolved = [...solved, n];
          setSolved(nextSolved);
          write(SOLVED_KEY, nextSolved);
        }
      }
      setBest(nextBest);
      write(dayKey(n), { runs: nextRuns, best: nextBest });

      if (!res.pass || practice) return;
      if (!signedIn) {
        setSubmit(accountsEnabled ? { saved: false, reason: "signed-out" } : "idle");
        return;
      }
      setSubmit("saving");
      submitDailyRun({ day: n, design })
        .then((r) => {
          setSubmit(r);
          if (r.saved) router.refresh();
        })
        .catch(() => setSubmit({ saved: false, reason: "invalid" }));
    },
    [runs, best, solved, n, signedIn, accountsEnabled, router, practice],
  );

  const share = useCallback(async () => {
    if (!best) return;
    const data = { n, servers: best.servers, p99: best.p99, streak: streak.current, runs };
    const text = shareText(data, par, `${location.origin}/daily/s/${encodeShare(data)}`);
    const touch = window.matchMedia?.("(pointer: coarse)").matches;
    if (touch && navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // Dismissed: nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: fall back to the share page itself.
      window.open(`/daily/s/${encodeShare(data)}`, "_blank", "noopener");
    }
  }, [best, n, par, runs, streak]);

  const meter = useCallback(
    (design: DesignSpec) => {
      const servers = serversIn(design);
      if (design.nodes.length === 0) return null;
      return (
        <span
          className="servers-meter"
          data-over={servers > par || undefined}
          title={`Servers in this design (par ${par})`}
        >
          <span className="tnum text-fg">{servers}</span>
          <span className="text-fg-3">{`/ par ${par}`}</span>
        </span>
      );
    },
    [par],
  );

  const briefTop = (
    <section className="border-b border-line p-4">
      <h2 className="text-xs text-fg-3">The goal</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-fg-2">
        Meet every target with the fewest servers. Every replica of every component counts as one.
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md border border-line bg-surface-2 px-2 py-2">
          <dt className="text-[11px] text-fg-3">Par</dt>
          <dd className="tnum text-lg text-fg">{par}</dd>
        </div>
        <div className="rounded-md border border-line bg-surface-2 px-2 py-2">
          <dt className="text-[11px] text-fg-3">Your best</dt>
          <dd className="tnum text-lg text-fg">{best ? best.servers : "–"}</dd>
        </div>
        <div className="rounded-md border border-line bg-surface-2 px-2 py-2">
          <dt className="text-[11px] text-fg-3">Streak</dt>
          <dd className="tnum text-lg text-fg">{streak.current}</dd>
        </div>
      </dl>
    </section>
  );

  const afterResult =
    last?.pass && best ? (
      <div
        className="daily-solved mt-4 rounded-md border p-3"
        data-under={best.servers <= par || undefined}
      >
        <p className="flex items-center gap-2 text-sm font-medium text-fg">
          <CheckGlyph size={12} className="text-ok-fg" />
          Solved with <span className="tnum">{last.servers}</span> server
          {last.servers === 1 ? "" : "s"}
          <span
            className="par-chip"
            data-tone={last.servers < par ? "under" : last.servers === par ? "on" : "over"}
          >
            {parPhrase(last.servers, par)}
          </span>
        </p>
        {best.servers < last.servers && (
          <p className="mt-1 text-xs text-fg-3">
            Your best today is still <span className="tnum">{best.servers}</span>.
          </p>
        )}
        {last.servers > par && (
          <p className="mt-1 text-xs text-fg-3">Par is {par}. Can you take a server away?</p>
        )}

        <div className="mt-3 flex items-end justify-between gap-3">
          <RunGrid runs={runs} />
          <p className="text-right text-xs text-fg-3">
            {streak.current > 0 ? (
              <>
                <span className="tnum text-sm text-fg">{streak.current}</span>-day streak
                {streak.best > streak.current && <span className="block">best {streak.best}</span>}
              </>
            ) : null}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={share} className="btn btn-primary btn-sm">
            {copied ? "Copied to clipboard" : "Share result"}
          </button>
          <SubmitLine state={submit} />
        </div>
      </div>
    ) : null;

  const mode: CanvasMode = { onScored, briefTop, meter, afterResult };
  return <PlaygroundCanvas challenge={challenge} mode={mode} />;
}

function SubmitLine({ state }: { state: Submit }) {
  if (state === "idle") return null;
  const text =
    state === "saving" ? (
      "Saving…"
    ) : state.saved ? (
      state.improved ? (
        "On the leaderboard."
      ) : (
        "Your best today still stands."
      )
    ) : state.reason === "signed-out" ? (
      <>
        <Link
          href="/signin?callbackUrl=%2Fdaily"
          className="focus-ring rounded-sm text-fg underline decoration-line-strong underline-offset-2 hover:decoration-fg"
        >
          Sign in
        </Link>{" "}
        to join the leaderboard.
      </>
    ) : state.reason === "expired" ? (
      "A new puzzle has started; this one is closed."
    ) : (
      <span className="text-bad-fg">Couldn&apos;t save. Run it again.</span>
    );
  return (
    <p aria-live="polite" className="text-xs text-fg-3">
      {text}
    </p>
  );
}
