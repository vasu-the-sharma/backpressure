/**
 * Quizzes are authored as typed modules (same pattern as systems and
 * challenges). A quiz is a list of MCQ / multi-select questions; grading is
 * client-side and immediate. No backend.
 */
export type QuestionType = "single" | "multi";

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  /** Optional scenario/context shown above the prompt. */
  scenario?: string;
  prompt: string;
  type: QuestionType;
  options: QuizOption[];
  /** Option ids that are correct — one for "single", one or more for "multi". */
  correct: string[];
  /** Shown once the question is answered. */
  explanation: string;
}

export interface Quiz {
  slug: string;
  title: string;
  topic: string;
  blurb: string;
  questions: QuizQuestion[];
}
