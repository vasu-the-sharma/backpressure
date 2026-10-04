"use client";

import type { Quiz, QuizQuestion } from "@/content/quizzes/schema";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Answer {
  selected: string[];
  correct: boolean;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

export function QuizRunner({ quiz }: { quiz: Quiz }) {
  const total = quiz.questions.length;
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const atResults = index >= total;
  const question = atResults ? undefined : quiz.questions[index];
  const submitted = !atResults && index < answers.length;
  const score = answers.filter((a) => a.correct).length;

  useEffect(() => {
    if (!atResults) return;
    try {
      const key = `bp.quiz.${quiz.slug}`;
      const prev = Number(localStorage.getItem(key) ?? "-1");
      if (score > prev) localStorage.setItem(key, String(score));
    } catch {
      // storage unavailable — scores are a convenience.
    }
  }, [atResults, score, quiz.slug]);

  const toggle = (id: string) => {
    if (submitted || !question) return;
    if (question.type === "single") setPicks([id]);
    else setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const submit = () => {
    if (!question || picks.length === 0) return;
    setAnswers((a) => [...a, { selected: picks, correct: sameSet(picks, question.correct) }]);
  };

  const next = () => {
    setIndex((i) => i + 1);
    setPicks([]);
  };

  const retry = () => {
    setIndex(0);
    setPicks([]);
    setAnswers([]);
  };

  if (atResults) {
    return <Results quiz={quiz} answers={answers} score={score} onRetry={retry} />;
  }
  if (!question) return null;

  const current = answers[index];

  return (
    <div className="card p-5 sm:p-6">
      {/* progress */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          Question {index + 1} / {total}
        </span>
        <span className="tnum text-xs text-fg-subtle">
          Score <span className="text-fg">{score}</span>
        </span>
      </div>
      <div className="mb-5 h-1 overflow-hidden rounded-full bg-raised">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-300"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>

      {question.scenario && (
        <p className="mb-2 rounded-lg border border-edge bg-raised px-3.5 py-2.5 text-sm leading-relaxed text-fg-muted">
          {question.scenario}
        </p>
      )}
      <h2 className="text-lg font-semibold leading-snug tracking-[-0.01em] text-fg">
        {question.prompt}
      </h2>
      {question.type === "multi" && (
        <p className="mt-1 text-xs text-fg-subtle">Select all that apply.</p>
      )}

      <ul className="mt-4 space-y-2.5">
        {question.options.map((opt) => (
          <li key={opt.id}>
            <OptionCard
              text={opt.text}
              type={question.type}
              picked={picks.includes(opt.id)}
              submitted={submitted}
              isCorrect={question.correct.includes(opt.id)}
              onClick={() => toggle(opt.id)}
            />
          </li>
        ))}
      </ul>

      {!submitted ? (
        <button
          type="button"
          onClick={submit}
          disabled={picks.length === 0}
          className="btn btn-primary mt-5"
        >
          Submit answer
        </button>
      ) : (
        <div className="mt-5">
          <Feedback correct={!!current?.correct} explanation={question.explanation} />
          <button type="button" onClick={next} className="btn btn-primary mt-4">
            {index + 1 < total ? "Next question" : "See results"}
          </button>
        </div>
      )}
    </div>
  );
}

function OptionCard({
  text,
  type,
  picked,
  submitted,
  isCorrect,
  onClick,
}: {
  text: string;
  type: QuizQuestion["type"];
  picked: boolean;
  submitted: boolean;
  isCorrect: boolean;
  onClick: () => void;
}) {
  // state → border/background color
  let borderColor = "var(--color-edge)";
  let bg: string | undefined;
  if (submitted) {
    if (isCorrect) {
      borderColor = "color-mix(in srgb, var(--color-healthy) 55%, transparent)";
      bg = "color-mix(in srgb, var(--color-healthy) 8%, transparent)";
    } else if (picked) {
      borderColor = "color-mix(in srgb, var(--color-danger) 55%, transparent)";
      bg = "color-mix(in srgb, var(--color-danger) 8%, transparent)";
    }
  } else if (picked) {
    borderColor = "var(--color-brand)";
    bg = "color-mix(in srgb, var(--color-brand) 10%, transparent)";
  }

  const mark = type === "single" ? "rounded-full" : "rounded";
  let markColor = picked ? "var(--color-brand-bright)" : "var(--color-edge-strong)";
  if (submitted && isCorrect) markColor = "var(--color-healthy)";
  else if (submitted && picked) markColor = "var(--color-danger)";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={submitted}
      className="flex w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] disabled:cursor-default enabled:hover:border-edge-strong"
      style={{ borderColor, background: bg }}
    >
      <span
        aria-hidden
        className={`flex h-4 w-4 shrink-0 items-center justify-center border-2 ${mark}`}
        style={{ borderColor: markColor, background: picked ? markColor : "transparent" }}
      >
        {submitted && isCorrect && <Glyph kind="check" />}
        {submitted && picked && !isCorrect && <Glyph kind="x" />}
      </span>
      <span className={submitted && isCorrect ? "text-fg" : "text-fg-muted"}>{text}</span>
    </button>
  );
}

function Feedback({ correct, explanation }: { correct: boolean; explanation: string }) {
  const color = correct ? "var(--color-healthy)" : "var(--color-danger)";
  return (
    <div
      className="rounded-lg border p-3.5"
      style={{
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
        background: `color-mix(in srgb, ${color} 6%, transparent)`,
      }}
    >
      <p className="font-mono text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>
        {correct ? "Correct" : "Not quite"}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{explanation}</p>
    </div>
  );
}

function Results({
  quiz,
  answers,
  score,
  onRetry,
}: {
  quiz: Quiz;
  answers: Answer[];
  score: number;
  onRetry: () => void;
}) {
  const total = quiz.questions.length;
  const pct = Math.round((score / total) * 100);
  const message =
    pct >= 85 ? "Sharp instincts." : pct >= 60 ? "Solid — a few to sharpen." : "Worth a rerun.";

  return (
    <div className="card p-5 sm:p-6">
      <p className="eyebrow mb-2">Results</p>
      <div className="flex items-baseline gap-3">
        <span className="tnum text-4xl font-bold text-brand-bright">
          {score}
          <span className="text-2xl text-fg-subtle">/{total}</span>
        </span>
        <span className="text-sm text-fg-muted">{message}</span>
      </div>

      <ul className="mt-5 space-y-2">
        {quiz.questions.map((q, i) => {
          const ok = answers[i]?.correct;
          const color = ok ? "var(--color-healthy)" : "var(--color-danger)";
          return (
            <li
              key={q.id}
              className="flex items-start gap-2.5 rounded-lg border border-edge px-3.5 py-2.5 text-sm"
            >
              <span className="mt-0.5 shrink-0" style={{ color }}>
                <Glyph kind={ok ? "check" : "x"} />
              </span>
              <span className="text-fg-muted">{q.prompt}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={onRetry} className="btn btn-primary">
          Try again
        </button>
        <Link href="/quiz" className="btn btn-secondary">
          Back to quizzes
        </Link>
      </div>
    </div>
  );
}

function Glyph({ kind }: { kind: "check" | "x" }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "check" ? <path d="M20 6 9 17l-5-5" /> : <path d="M18 6 6 18M6 6l12 12" />}
    </svg>
  );
}
