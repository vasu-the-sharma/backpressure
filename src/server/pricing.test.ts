import { testDb } from "@/test/db";
import { describe, expect, it } from "vitest";
import { addToWaitlist } from "./daily";
import { pricingResults, recordExposure, recordSurvey } from "./pricing";

describe("price test", () => {
  it("counts each visitor once per arm and computes join rates with intervals", async () => {
    const db = await testDb();
    // Arm a: 4 visitors (one seen twice, on two pages and two days), 2 join, 1 annual.
    for (const v of ["v1", "v2", "v3", "v4"]) {
      await recordExposure(db, {
        visitorId: v,
        page: "pricing",
        day: 1,
        arm: "a",
        segment: "intl",
      });
    }
    await recordExposure(db, {
      visitorId: "v1",
      page: "pricing",
      day: 1,
      arm: "a",
      segment: "intl",
    });
    await recordExposure(db, {
      visitorId: "v1",
      page: "daily-archive",
      day: 2,
      arm: "a",
      segment: "intl",
    });
    // Arm c: 2 visitors, 0 joins.
    for (const v of ["v5", "v6"]) {
      await recordExposure(db, {
        visitorId: v,
        page: "pricing",
        day: 1,
        arm: "c",
        segment: "intl",
      });
    }
    const join = (email: string, period: string) =>
      addToWaitlist(db, {
        email,
        plan: "pro",
        source: "pricing",
        arm: "a",
        segment: "intl",
        period,
        priceVariant: `pro-intl-a-${period}`,
        priceCents: period === "annual" ? 9900 : 1900,
      });
    await join("one@example.com", "monthly");
    await join("two@example.com", "annual");
    // A Teams signup and an unpriced Pro signup don't count toward the test.
    await addToWaitlist(db, { email: "team@example.com", plan: "teams", source: "pricing" });
    await addToWaitlist(db, { email: "old@example.com", plan: "pro", source: "daily-archive" });

    const r = await pricingResults(db);
    const a = r.intl.arms.find((x) => x.arm === "a");
    const c = r.intl.arms.find((x) => x.arm === "c");
    expect(a).toMatchObject({
      visitors: 4,
      joins: 2,
      rate: 0.5,
      annualShare: 0.5,
      revenueIndex: 100,
    });
    expect(a?.low).toBeGreaterThan(0);
    expect(a?.high).toBeLessThan(1);
    expect(c).toMatchObject({ visitors: 2, joins: 0, rate: 0, revenueIndex: 0 });
    expect(r.in.arms.every((x) => x.visitors === 0)).toBe(true);
  });

  it("runs Van Westendorp per region and reports contradictory answers", async () => {
    const db = await testDb();
    await recordSurvey(db, {
      visitorId: "v1",
      segment: "intl",
      tooCheap: 5,
      cheap: 15,
      expensive: 30,
      tooExpensive: 45,
    });
    await recordSurvey(db, {
      visitorId: "v2",
      segment: "intl",
      tooCheap: 10,
      cheap: 20,
      expensive: 35,
      tooExpensive: 50,
    });
    await recordSurvey(db, {
      visitorId: "v3",
      segment: "intl",
      tooCheap: 50,
      cheap: 10,
      expensive: 5,
      tooExpensive: 1,
    });
    await recordSurvey(db, {
      visitorId: "v4",
      segment: "in",
      tooCheap: 200,
      cheap: 500,
      expensive: 1000,
      tooExpensive: 1500,
    });
    const r = await pricingResults(db);
    expect(r.intl.survey).toMatchObject({ used: 2, excluded: 1, opp: 15, pme: 30 });
    expect(r.in.survey.used).toBe(1);
  });
});
