"use client";

import { CheckGlyph, CrossGlyph } from "@/components/ui";
import type { Quiz, QuizQuestion } from "@/content/quizzes/schema";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Answer {
  selected: string[];
  correct: boolean;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

const letter = (i: number) => String.fromCharCode(65 + i);

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

  const toggle = useCallback(
    (id: string) => {
      if (submitted || !question) return;
      if (question.type === "single") setPicks([id]);
      else setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    },
    [submitted, question],
  );

  const submit = useCallback(() => {
    if (!question || picks.length === 0) return;
    setAnswers((a) => [...a, { selected: picks, correct: sameSet(picks, question.correct) }]);
  }, [question, picks]);

  const next = useCallback(() => {
    setIndex((i) => i + 1);
    setPicks([]);
  }, []);

  const retry = () => {
    setIndex(0);
    setPicks([]);
    setAnswers([]);
  };

  // Keyboard: A–D (or 1–4) choose, Enter submits / advances.
  useEffect(() => {
    if (!question) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === "enter") {
        // Let other focused controls handle their own Enter; options defer to submit.
        const isOption = target?.dataset.option !== undefined;
        if (!isOption && (target?.tagName === "BUTTON" || target?.tagName === "A")) return;
        e.preventDefault();
        if (submitted) next();
        else submit();
        return;
      }
      const i = /^[1-9]$/.test(k) ? Number(k) - 1 : k.length === 1 ? k.charCodeAt(0) - 97 : -1;
      const opt = i >= 0 ? question.options[i] : undefined;
      if (opt) {
        e.preventDefault();
        toggle(opt.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, submitted, submit, next, toggle]);

  if (atResults) {
    return <Results quiz={quiz} answers={answers} score={score} onRetry={retry} />;
  }
  if (!question) return null;

  const current = answers[index];

  return (
    <section className="panel overflow-hidden" aria-label={`Question ${index + 1} of ${total}`}>
      {/* progress */}
      <div className="border-b border-line px-5 py-3 sm:px-6">
        <div className="flex items-center justify-between text-xs">
          <span className="text-fg-3">
            Question <span className="tnum text-fg">{index + 1}</span> of{" "}
            <span className="tnum">{total}</span>
          </span>
          <span className="text-fg-3">
            Score <span className="tnum text-fg">{score}</span>
          </span>
        </div>
        <ol className="mt-2.5 flex gap-1" aria-hidden>
          {quiz.questions.map((q, i) => {
            const a = answers[i];
            const cls = a ? (a.correct ? "bg-ok" : "bg-bad") : i === index ? "bg-fg" : "bg-fill-2";
            return (
              <li
                key={q.id}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${cls}`}
              />
            );
          })}
        </ol>
      </div>

      <div className="px-5 py-6 sm:px-6">
        {question.scenario && (
          <p className="mb-4 rounded-md border border-line bg-surface-2 px-4 py-3 text-sm leading-relaxed text-fg-2">
            {question.scenario}
          </p>
        )}
        <h2 className="text-lg font-medium leading-snug tracking-tight text-fg">
          {question.prompt}
        </h2>
        {question.type === "multi" && (
          <p className="mt-1 text-xs text-fg-3">Select all that apply.</p>
        )}

        <ul
          className="mt-5 space-y-2"
          role={question.type === "single" ? "radiogroup" : "group"}
          aria-label="Options"
        >
          {question.options.map((opt, i) => (
            <li key={opt.id}>
              <OptionButton
                letter={letter(i)}
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

        {submitted && <Feedback correct={!!current?.correct} explanation={question.explanation} />}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line bg-surface-2 px-5 py-3 sm:px-6">
        <p className="hidden text-xs text-fg-3 sm:block">
          <span className="kbd">A</span>–
          <span className="kbd">{letter(question.options.length - 1)}</span> to choose ·{" "}
          <span className="kbd">↵</span> to {submitted ? "continue" : "submit"}
        </p>
        {!submitted ? (
          <button
            type="button"
            onClick={submit}
            disabled={picks.length === 0}
            className="btn btn-primary ml-auto"
          >
            Submit answer
          </button>
        ) : (
          <button type="button" onClick={next} className="btn btn-primary ml-auto">
            {index + 1 < total ? "Next question" : "See results"}
          </button>
        )}
      </div>
    </section>
  );
}

function OptionButton({
  letter,
  text,
  type,
  picked,
  submitted,
  isCorrect,
  onClick,
}: {
  letter: string;
  text: string;
  type: QuizQuestion["type"];
  picked: boolean;
  submitted: boolean;
  isCorrect: boolean;
  onClick: () => void;
}) {
  let state =
    "border-line-strong bg-surface text-fg-2 enabled:hover:border-[#3a3a3a] enabled:hover:bg-surface-2 enabled:hover:text-fg enabled:active:bg-fill";
  if (submitted && isCorrect) state = "border-ok/50 bg-ok/10 text-fg";
  else if (submitted && picked) state = "border-bad/50 bg-bad/10 text-fg";
  else if (submitted) state = "border-line bg-surface text-fg-3";
  else if (picked) state = "border-fg bg-surface-2 text-fg";

  return (
    <button
      type="button"
      role={type === "single" ? "radio" : "checkbox"}
      data-option
      aria-checked={picked}
      onClick={onClick}
      disabled={submitted}
      className={`focus-ring flex w-full items-center gap-3 rounded-md border px-3.5 py-3 text-left text-sm transition-colors duration-150 ease-out disabled:cursor-default ${state}`}
    >
      <span
        className={`kbd shrink-0 ${picked && !submitted ? "!border-fg !bg-fg !text-black" : ""}`}
        aria-hidden
      >
        {letter}
      </span>
      <span className="flex-1">{text}</span>
      {submitted && isCorrect && <CheckGlyph size={13} className="shrink-0 text-ok-fg" />}
      {submitted && picked && !isCorrect && (
        <CrossGlyph size={13} className="shrink-0 text-bad-fg" />
      )}
    </button>
  );
}

function Feedback({ correct, explanation }: { correct: boolean; explanation: string }) {
  return (
    <div
      aria-live="polite"
      className={`mt-5 rounded-md border p-4 ${
        correct ? "border-ok/30 bg-ok/[0.06]" : "border-bad/30 bg-bad/[0.06]"
      }`}
    >
      <p className={`text-sm font-medium ${correct ? "text-ok-fg" : "text-bad-fg"}`}>
        {correct ? "Correct" : "Not quite"}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-fg-2">{explanation}</p>
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
    <section className="panel overflow-hidden" aria-label="Results">
      <div className="border-b border-line px-5 py-8 text-center sm:px-6">
        <p className="text-xs text-fg-3">Your score</p>
        <p className="display tnum mt-2 text-6xl text-fg">
          {score}
          <span className="text-fg-3">/{total}</span>
        </p>
        <p className="mt-3 text-sm text-fg-2">{message}</p>
      </div>

      <ol className="divide-y divide-line">
        {quiz.questions.map((q, i) => {
          const a = answers[i];
          const ok = !!a?.correct;
          const yours = q.options
            .filter((o) => a?.selected.includes(o.id))
            .map((o) => o.text)
            .join(", ");
          const right = q.options
            .filter((o) => q.correct.includes(o.id))
            .map((o) => o.text)
            .join(", ");
          return (
            <li key={q.id} className="flex gap-3 px-5 py-3.5 sm:px-6">
              <span className={`mt-0.5 shrink-0 ${ok ? "text-ok-fg" : "text-bad-fg"}`}>
                {ok ? <CheckGlyph size={13} /> : <CrossGlyph size={13} />}
              </span>
              <div className="min-w-0 text-sm">
                <p className="text-fg">{q.prompt}</p>
                {!ok && (
                  <p className="mt-1 text-xs leading-relaxed text-fg-3">
                    You chose <span className="text-fg-2">{yours || "nothing"}</span> · Answer:{" "}
                    <span className="text-ok-fg">{right}</span>
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3 sm:px-6">
        <Link href="/quiz" className="btn btn-secondary">
          All quizzes
        </Link>
        <button type="button" onClick={onRetry} className="btn btn-primary">
          Try again
        </button>
      </div>
    </section>
  );
}
