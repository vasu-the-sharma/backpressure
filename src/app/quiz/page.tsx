import { QuizScoreBadge } from "@/components/QuizScoreBadge";
import { getAllQuizzes } from "@/content/quizzes/registry";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quiz",
  description:
    "Quick MCQ drills on load, caching, fan-out, and bottlenecks — the instincts the simulator trains.",
};

export default function QuizIndex() {
  const quizzes = getAllQuizzes();

  return (
    <div>
      <section className="mb-12">
        <p className="eyebrow mb-4">Quiz · beta</p>
        <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
          Test your system-design <span className="text-brand-bright">instincts.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-fg-muted">
          Fast multiple-choice drills on the ideas the simulator is built around — load, caching,
          fan-out, backpressure, and finding the bottleneck. Answer, get the reason immediately, and
          move on.
        </p>
      </section>

      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-medium uppercase tracking-[0.1em] text-fg-subtle">Quizzes</h2>
        <span className="tnum text-xs text-fg-subtle">{quizzes.length} available</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {quizzes.map((q) => (
          <Link
            key={q.slug}
            href={`/quiz/${q.slug}`}
            className="card group relative overflow-hidden p-5 outline-none transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_12px_32px_-16px_rgba(110,86,247,0.5)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-ink)]"
          >
            <span
              aria-hidden
              className="absolute left-0 top-0 h-full w-0.5 origin-top scale-y-0 bg-brand transition-transform duration-200 group-hover:scale-y-100"
            />
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold tracking-[-0.01em] text-fg transition-colors group-hover:text-brand-bright">
                {q.title}
              </h3>
              <div className="flex shrink-0 items-center gap-2">
                <QuizScoreBadge slug={q.slug} total={q.questions.length} />
                <span className="badge">{q.topic}</span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">{q.blurb}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-bright">
                Start quiz
                <span
                  aria-hidden
                  className="transition-transform duration-150 group-hover:translate-x-0.5"
                >
                  →
                </span>
              </span>
              <span className="tnum text-xs text-fg-subtle">{q.questions.length} questions</span>
            </div>
          </Link>
        ))}

        {/* Upcoming: sim-linked questions */}
        <div className="card relative overflow-hidden border-dashed p-5 opacity-80">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-[-0.01em] text-fg-subtle">
              Sim-linked questions
            </h3>
            <span
              className="shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
              style={{
                color: "var(--color-warn)",
                borderColor: "color-mix(in srgb, var(--color-warn) 40%, transparent)",
                background: "color-mix(in srgb, var(--color-warn) 10%, transparent)",
              }}
            >
              Upcoming
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-fg-subtle">
            Run a live design in the simulator, then answer questions about what actually happened —
            which tier saturated, where the bottleneck moved, how to fix it. Quiz and simulator,
            wired together.
          </p>
        </div>
      </div>
    </div>
  );
}
