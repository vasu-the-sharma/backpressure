import { describe, expect, it } from "vitest";
import { isConsistent, vanWestendorp, visitorsPerArm, wilson } from "./analysis";
import {
  PRO_PRICES,
  annualSaving,
  formatMoney,
  perMonthOfAnnual,
  segmentForCountry,
  variantId,
} from "./plans";

describe("price ladders", () => {
  it("rise with the arm and discount annual the same way in every arm", () => {
    for (const seg of Object.values(PRO_PRICES)) {
      expect(seg.a.monthly).toBeLessThan(seg.b.monthly);
      expect(seg.b.monthly).toBeLessThan(seg.c.monthly);
      const savings = [seg.a, seg.b, seg.c].map(annualSaving);
      for (const s of savings) expect(s).toBeGreaterThanOrEqual(55);
      expect(Math.max(...savings) - Math.min(...savings)).toBeLessThanOrEqual(3);
    }
  });

  it("formats prices and ids", () => {
    expect(formatMoney(29, "USD")).toBe("$29");
    expect(formatMoney(4999, "INR")).toBe("₹4,999");
    expect(perMonthOfAnnual(PRO_PRICES.intl.b)).toBe("$12.42");
    expect(variantId("in", "c", "annual")).toBe("pro-in-c-annual");
    expect(segmentForCountry("IN")).toBe("in");
    expect(segmentForCountry("us")).toBe("intl");
    expect(segmentForCountry(null)).toBe("intl");
  });
});

describe("Wilson interval", () => {
  it("stays inside [0, 1] and narrows with more data", () => {
    const small = wilson(1, 20);
    const large = wilson(50, 1000);
    expect(small.low).toBeGreaterThanOrEqual(0);
    expect(small.high).toBeLessThanOrEqual(1);
    expect(large.high - large.low).toBeLessThan(small.high - small.low);
    expect(wilson(0, 0)).toEqual({ low: 0, high: 1 });
    // Known value: 10 of 100 → about 5.5% to 17.4%.
    const k = wilson(10, 100);
    expect(k.low).toBeCloseTo(0.0552, 3);
    expect(k.high).toBeCloseTo(0.1744, 3);
  });

  it("sizes an arm to tell 4% from 2.5% apart", () => {
    expect(visitorsPerArm(0.04, 0.025)).toBeGreaterThan(2000);
    expect(visitorsPerArm(0.04, 0.025)).toBeLessThan(2400);
  });
});

describe("Van Westendorp", () => {
  const r = (tooCheap: number, cheap: number, expensive: number, tooExpensive: number) => ({
    tooCheap,
    cheap,
    expensive,
    tooExpensive,
  });

  it("sets aside answers that contradict themselves, and says so", () => {
    expect(isConsistent(r(5, 10, 20, 30))).toBe(true);
    expect(isConsistent(r(10, 5, 20, 30))).toBe(false);
    const result = vanWestendorp([r(5, 10, 20, 30), r(30, 20, 10, 5)]);
    expect(result.used).toBe(1);
    expect(result.excluded).toBe(1);
  });

  it("draws the cheap curves falling and the expensive curves rising", () => {
    const result = vanWestendorp([r(5, 10, 30, 45), r(10, 15, 35, 50), r(8, 12, 32, 48)]);
    const c = result.curves;
    for (let i = 1; i < c.length; i++) {
      const [prev, cur] = [c[i - 1], c[i]];
      if (!prev || !cur) continue;
      expect(cur.tooCheap).toBeLessThanOrEqual(prev.tooCheap);
      expect(cur.cheap).toBeLessThanOrEqual(prev.cheap);
      expect(cur.expensive).toBeGreaterThanOrEqual(prev.expensive);
      expect(cur.tooExpensive).toBeGreaterThanOrEqual(prev.tooExpensive);
    }
  });

  it("finds the four intersections in a known case", () => {
    // Half the people answer (5, 15, 30, 45), half (10, 20, 35, 50).
    const result = vanWestendorp([r(5, 15, 30, 45), r(10, 20, 35, 50)]);
    // "Too cheap" falls to 0 above 10 while "expensive" is still 0 until 30:
    // they meet once too-cheap hits 0, interpolated between 10 and 15.
    expect(result.pmc).toBe(15);
    expect(result.opp).toBe(15);
    // "Cheap" is 0.5 at 20 and 0 at 30, where "expensive" reaches 0.5.
    expect(result.idp).toBeCloseTo(25, 5);
    // "Cheap" is 0 from 30 on; "too expensive" is 0 until 45.
    expect(result.pme).toBe(30);
    expect(result.pmc ?? 0).toBeLessThanOrEqual(result.pme ?? 0);
  });

  it("returns nothing to plot without answers", () => {
    expect(vanWestendorp([]).curves).toEqual([]);
    expect(vanWestendorp([]).opp).toBeNull();
  });
});
