import { QuizRunner } from "@/components/QuizRunner";
import { getAllQuizSlugs, getQuiz } from "@/content/quizzes/registry";
import type { Metadata } from "next";
import Link from "next/link";
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
      <nav className="mb-6 flex items-center gap-2 text-sm text-fg-subtle">
        <Link href="/quiz" className="transition-colors hover:text-fg">
          Quiz
        </Link>
        <span aria-hidden className="opacity-50">
          /
        </span>
        <span className="text-fg-muted">{quiz.title}</span>
      </nav>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-[-0.02em]">{quiz.title}</h1>
          <span className="badge">{quiz.topic}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{quiz.blurb}</p>
      </header>

      <QuizRunner quiz={quiz} />
    </article>
  );
}
