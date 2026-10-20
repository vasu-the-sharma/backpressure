import { type VwResult, vanWestendorp, wilson } from "@/content/pricing/analysis";
import { ARMS, type Arm, PRO_PRICES, type ProPrice, type Segment } from "@/content/pricing/plans";
import type { Db } from "@/db";
import { priceExposures, priceSurveys, waitlist } from "@/db/schema";
import { and, countDistinct, eq, isNotNull, sql } from "drizzle-orm";

/** The price test on the server: log who saw which price, store survey answers, read results. */

export interface Exposure {
  visitorId: string;
  page: string;
  day: number;
  arm: Arm;
  segment: Segment;
}

/** One row per visitor, page and day; repeats are ignored. */
export async function recordExposure(db: Db, e: Exposure): Promise<void> {
  await db.insert(priceExposures).values(e).onConflictDoNothing();
}

export interface SurveyAnswer {
  visitorId: string | null;
  segment: Segment;
  tooCheap: number;
  cheap: number;
  expensive: number;
  tooExpensive: number;
}

export async function recordSurvey(db: Db, s: SurveyAnswer): Promise<void> {
  await db.insert(priceSurveys).values({ ...s, currency: PRO_PRICES[s.segment].a.currency });
}

export interface ArmResult {
  arm: Arm;
  price: ProPrice;
  visitors: number;
  joins: number;
  rate: number;
  low: number;
  high: number;
  /** Share of joins that picked annual billing. */
  annualShare: number;
  /** Monthly price × join rate, scaled so the best arm is 100. */
  revenueIndex: number;
}

export interface SegmentResult {
  arms: ArmResult[];
  survey: VwResult;
}

export async function pricingResults(db: Db): Promise<Record<Segment, SegmentResult>> {
  const [visitors, joins, surveys] = await Promise.all([
    db
      .select({
        segment: priceExposures.segment,
        arm: priceExposures.arm,
        visitors: countDistinct(priceExposures.visitorId),
      })
      .from(priceExposures)
      .groupBy(priceExposures.segment, priceExposures.arm),
    db
      .select({
        segment: waitlist.segment,
        arm: waitlist.arm,
        joins: sql<number>`count(*)`.mapWith(Number),
        annual: sql<number>`count(*) filter (where ${waitlist.period} = 'annual')`.mapWith(Number),
      })
      .from(waitlist)
      .where(and(eq(waitlist.plan, "pro"), isNotNull(waitlist.arm)))
      .groupBy(waitlist.segment, waitlist.arm),
    db.select().from(priceSurveys),
  ]);

  const out = {} as Record<Segment, SegmentResult>;
  for (const segment of ["intl", "in"] as Segment[]) {
    const arms = ARMS.map((arm): ArmResult => {
      const v = Number(visitors.find((r) => r.segment === segment && r.arm === arm)?.visitors ?? 0);
      const j = joins.find((r) => r.segment === segment && r.arm === arm);
      const n = j?.joins ?? 0;
      const ci = wilson(n, v);
      return {
        arm,
        price: PRO_PRICES[segment][arm],
        visitors: v,
        joins: n,
        rate: v > 0 ? n / v : 0,
        low: ci.low,
        high: ci.high,
        annualShare: n > 0 ? (j?.annual ?? 0) / n : 0,
        revenueIndex: 0,
      };
    });
    const best = Math.max(...arms.map((a) => a.price.monthly * a.rate));
    for (const a of arms)
      a.revenueIndex = best > 0 ? Math.round((100 * a.price.monthly * a.rate) / best) : 0;
    out[segment] = {
      arms,
      survey: vanWestendorp(surveys.filter((s) => s.segment === segment)),
    };
  }
  return out;
}
