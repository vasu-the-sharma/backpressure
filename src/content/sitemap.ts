import { getAllChallengeSlugs } from "./challenges/registry";
import { getAllQuizSlugs } from "./quizzes/registry";
import { getAllSlugs } from "./registry";

/**
 * Every page worth a search result: the fixed pages, then one per system,
 * challenge and quiz. Left out on purpose: sign-in, accounts, admin, single
 * past puzzles (Pro) and shared results (marked noindex).
 */
export function sitemapPaths(): string[] {
  return [
    "/",
    "/systems",
    ...getAllSlugs().map((s) => `/systems/${s}`),
    "/playground",
    ...getAllChallengeSlugs().map((s) => `/playground/${s}`),
    "/quiz",
    ...getAllQuizSlugs().map((s) => `/quiz/${s}`),
    "/daily",
    "/daily/archive",
    "/capacity",
    "/pricing",
    "/privacy",
    "/terms",
  ];
}
