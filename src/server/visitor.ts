import { type Arm, type Segment, isArm, segmentForCountry } from "@/content/pricing/plans";
import { cookies, headers } from "next/headers";

/**
 * Who this visitor is to the price test: their anonymous id, arm and region.
 * Pages read the middleware's request headers (set even on a first visit);
 * actions and API routes read the cookies it left behind. Region comes from
 * Vercel's geolocation header; elsewhere it defaults to international.
 */
export interface PriceVisitor {
  visitorId: string | null;
  arm: Arm;
  segment: Segment;
}

export async function priceVisitor(): Promise<PriceVisitor> {
  const [h, c] = await Promise.all([headers(), cookies()]);
  const armRaw = h.get("x-bp-arm") ?? c.get("bp_arm")?.value;
  return {
    visitorId: h.get("x-bp-vid") ?? c.get("bp_vid")?.value ?? null,
    arm: isArm(armRaw) ? armRaw : "b",
    segment: segmentForCountry(h.get("x-vercel-ip-country")),
  };
}

/** Whole days since the Unix epoch (UTC): the exposure log's day. */
export function utcDay(ms: number = Date.now()): number {
  return Math.floor(ms / 86_400_000);
}
