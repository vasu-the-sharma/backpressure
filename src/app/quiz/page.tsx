import { QuizScoreBadge } from "@/components/QuizScoreBadge";
import { ChevronRight, PageHeader } from "@/components/ui";
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
      <PageHeader
        display
        title="Test your instincts."
        description="Fast drills on the ideas the simulator is built around — load, caching, fan-out, backpressure, and finding the bottleneck. Answer, get the reasoning immediately, move on."
      />

      <section aria-labelledby="quizzes">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="quizzes" className="text-base font-medium text-fg">
            Quizzes
          </h2>
          <span className="tnum text-xs text-fg-3">{quizzes.length} available</span>
        </div>

        <ul className="panel divide-y divide-line overflow-hidden">
          {quizzes.map((q) => (
            <li key={q.slug}>
              <Link
                href={`/quiz/${q.slug}`}
                className="group focus-ring grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-4 py-4 transition-colors duration-150 ease-out hover:bg-surface-2 active:bg-fill sm:px-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="text-sm font-medium text-fg">{q.title}</p>
                    <p className="text-xs text-fg-3">
                      {q.topic} · {q.questions.length} questions
                    </p>
                  </div>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-fg-2">{q.blurb}</p>
                </div>
                <div className="flex items-center gap-3 self-start pt-0.5">
                  <QuizScoreBadge slug={q.slug} total={q.questions.length} />
                  <ChevronRight
                    size={14}
                    className="text-fg-3 transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-fg"
                  />
                </div>
              </Link>
            </li>
          ))}

          {/* Planned: sim-linked questions */}
          <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p className="text-sm font-medium text-fg-2">Sim-linked questions</p>
                <p className="text-xs text-fg-3">Planned</p>
              </div>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-fg-3">
                Run a live design, then answer questions about what actually happened — which tier
                saturated, where the bottleneck moved, how to fix it.
              </p>
            </div>
          </li>
        </ul>
      </section>
    </div>
  );
}
