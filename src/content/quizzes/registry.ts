import type { Quiz } from "./schema";
import { systemDesignInstincts } from "./system-design-instincts";

const quizzes: Quiz[] = [systemDesignInstincts];

const bySlug = new Map<string, Quiz>(quizzes.map((q) => [q.slug, q]));

export function getAllQuizzes(): Quiz[] {
  return quizzes;
}

export function getAllQuizSlugs(): string[] {
  return quizzes.map((q) => q.slug);
}

export function getQuiz(slug: string): Quiz | undefined {
  return bySlug.get(slug);
}
