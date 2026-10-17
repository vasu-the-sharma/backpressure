import { buildDesignGraph, validateChallengeDesign } from "@/content/challenges/build";
import { getChallenge } from "@/content/challenges/registry";
import { getQuiz } from "@/content/quizzes/registry";
import { scoreDesign } from "@/sim/score";
import { z } from "zod";

/**
 * Server-side grading. A client never reports "I passed": it sends what it
 * built or chose, and the server scores it with the same engine and content
 * the page uses. Deterministic, so the server's verdict matches what the
 * player saw.
 */

const nodeKind = z.enum([
  "client",
  "cdn",
  "gateway",
  "lb",
  "service",
  "cache",
  "queue",
  "db",
  "storage",
]);
const id = z.string().min(1).max(64);

export const challengeRunInput = z.object({
  slug: z.string().min(1).max(100),
  design: z.object({
    nodes: z
      .array(
        z.object({
          id,
          // Any kind parses; the palette check below rejects ones the challenge doesn't offer.
          kind: nodeKind,
          replicas: z.number().int().min(1).max(64).optional(),
        }),
      )
      .max(40),
    edges: z.array(z.tuple([id, id])).max(160),
  }),
});
export type ChallengeRunInput = z.infer<typeof challengeRunInput>;

export interface GradedRun {
  slug: string;
  passed: boolean;
  p99Ms: number;
  errorRate: number;
  throughputRps: number;
  nodeCount: number;
}

export function gradeChallengeRun(
  input: ChallengeRunInput,
): { ok: true; run: GradedRun } | { ok: false; error: string } {
  const challenge = getChallenge(input.slug);
  if (!challenge) return { ok: false, error: "Unknown challenge." };
  const allowed = new Set(challenge.palette);
  if (input.design.nodes.some((n) => !allowed.has(n.kind))) {
    return { ok: false, error: "Design uses a component this challenge doesn't offer." };
  }
  const graph = buildDesignGraph(challenge, input.design);
  const problems = validateChallengeDesign(challenge, graph);
  if (problems.length > 0) return { ok: false, error: problems[0] ?? "Invalid design." };

  const result = scoreDesign(graph, challenge.load, challenge.slo);
  return {
    ok: true,
    run: {
      slug: challenge.slug,
      passed: result.pass,
      p99Ms: Math.round(result.state.p99Ms),
      errorRate: result.state.errorRate,
      throughputRps: result.throughputRps,
      nodeCount: input.design.nodes.length,
    },
  };
}

export const quizAttemptInput = z.object({
  slug: z.string().min(1).max(100),
  /** Question id → the option ids chosen. */
  answers: z.record(z.string().max(64), z.array(z.string().max(64)).max(12)),
});
export type QuizAttemptInput = z.infer<typeof quizAttemptInput>;

export function gradeQuizAttempt(
  input: QuizAttemptInput,
): { ok: true; slug: string; score: number; total: number } | { ok: false; error: string } {
  const quiz = getQuiz(input.slug);
  if (!quiz) return { ok: false, error: "Unknown quiz." };
  let score = 0;
  for (const q of quiz.questions) {
    const picked = new Set(input.answers[q.id] ?? []);
    if (picked.size === q.correct.length && q.correct.every((c) => picked.has(c))) score += 1;
  }
  return { ok: true, slug: quiz.slug, score, total: quiz.questions.length };
}
