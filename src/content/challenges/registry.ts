import type { Challenge } from "./schema";
import { urlShortenerReads } from "./url-shortener-reads";

const challenges: Challenge[] = [urlShortenerReads];

const bySlug = new Map<string, Challenge>(challenges.map((c) => [c.slug, c]));

export function getAllChallenges(): Challenge[] {
  return challenges;
}

export function getAllChallengeSlugs(): string[] {
  return challenges.map((c) => c.slug);
}

export function getChallenge(slug: string): Challenge | undefined {
  return bySlug.get(slug);
}
