import { latencyBudget } from "./latency-budget";
import type { Challenge } from "./schema";
import { uberSurgeMatching } from "./uber-surge-matching";
import { urlShortenerReads } from "./url-shortener-reads";
import { whatsappGroupFanout } from "./whatsapp-group-fanout";
import { xTimelineFanout } from "./x-timeline-fanout";
import { youtubeUploadPubsub } from "./youtube-upload-pubsub";
import { youtubeViralStream } from "./youtube-viral-stream";

const challenges: Challenge[] = [
  urlShortenerReads,
  uberSurgeMatching,
  latencyBudget,
  xTimelineFanout,
  whatsappGroupFanout,
  youtubeViralStream,
  youtubeUploadPubsub,
];

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
