import { QuizRunner } from "@/components/QuizRunner";
import { Breadcrumbs } from "@/components/ui";
import { getAllQuizSlugs, getQuiz } from "@/content/quizzes/registry";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): Array<{ slug: string }> {
  return getAllQuizSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const quiz = getQuiz(slug);
  if (!quiz) return {};
  return { title: quiz.title, description: quiz.blurb };
}

export default async function QuizPage({ params }: PageProps) {
  const { slug } = await params;
  const quiz = getQuiz(slug);
  if (!quiz) notFound();

  return (
    <article className="mx-auto max-w-2xl">
      <Breadcrumbs items={[{ label: "Quiz", href: "/quiz" }, { label: quiz.title }]} />
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{quiz.title}</h1>
        <p className="mt-1 text-xs text-fg-3">
          {quiz.topic} · {quiz.questions.length} questions
        </p>
        <p className="mt-2 text-sm leading-relaxed text-fg-2">{quiz.blurb}</p>
      </header>

      {quiz.questions.length === 0 ? (
        <p className="panel px-4 py-10 text-center text-sm text-fg-3">
          This quiz has no questions yet.
        </p>
      ) : (
        <QuizRunner quiz={quiz} />
      )}
    </article>
  );
}
