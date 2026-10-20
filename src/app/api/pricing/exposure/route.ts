import { getDb } from "@/db";
import { isDbConfigured } from "@/server/config";
import { recordExposure } from "@/server/pricing";
import { priceVisitor, utcDay } from "@/server/visitor";
import { z } from "zod";

const body = z.object({ page: z.enum(["pricing", "daily-archive"]) });

/**
 * A page that showed a Pro price reports it here once it has rendered in a
 * browser: the price test's denominator. Crawlers that don't run scripts
 * never call it.
 */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  if (!isDbConfigured()) return new Response(null, { status: 204 });
  const v = await priceVisitor();
  if (!v.visitorId) return new Response(null, { status: 204 });
  await recordExposure(getDb(), {
    visitorId: v.visitorId,
    page: parsed.data.page,
    day: utcDay(),
    arm: v.arm,
    segment: v.segment,
  });
  return new Response(null, { status: 204 });
}
