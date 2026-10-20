import { type Arm, type Segment, isArm, segmentForCountry } from "@/content/pricing/plans";
import { headers } from "next/headers";

/**
 * Who this visitor is to the price test, as the middleware decided for this
 * request: their anonymous id, arm and region, and whether they're in the
 * test at all (visitors who haven't agreed where we must ask, or who said no,
 * see the middle price and have no id). The middleware runs on every path
 * that calls this: the price pages, the server actions they post to, and
 * /api/pricing. Region comes from Vercel's geolocation header; elsewhere it
 * defaults to international.
 */
export interface PriceVisitor {
  visitorId: string | null;
  arm: Arm;
  segment: Segment;
  /** True when the visitor is in the test (has an id and a random arm). */
  randomized: boolean;
  /** "ask" before a choice, "declined" after a no; null when no choice is needed or it was yes. */
  consent: "ask" | "declined" | null;
}

export async function priceVisitor(): Promise<PriceVisitor> {
  const h = await headers();
  const armRaw = h.get("x-bp-arm");
  const consentRaw = h.get("x-bp-consent");
  const visitorId = h.get("x-bp-vid");
  return {
    visitorId,
    arm: isArm(armRaw) ? armRaw : "b",
    segment: segmentForCountry(h.get("x-vercel-ip-country")),
    randomized: Boolean(visitorId),
    consent: consentRaw === "ask" || consentRaw === "declined" ? consentRaw : null,
  };
}

/** Whole days since the Unix epoch (UTC): the exposure log's day. */
export function utcDay(ms: number = Date.now()): number {
  return Math.floor(ms / 86_400_000);
}
