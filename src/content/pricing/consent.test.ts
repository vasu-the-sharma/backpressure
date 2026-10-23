import { describe, expect, it } from "vitest";
import { mustAsk } from "./consent";
import { quotedPrice } from "./plans";

describe("who is asked before the price test's cookies", () => {
  it("covers the EU, the EEA, the UK and Switzerland", () => {
    for (const c of ["DE", "FR", "IE", "NO", "IS", "LI", "GB", "CH", "gb"]) {
      expect(mustAsk(c)).toBe(true);
    }
  });

  it("doesn't ask elsewhere, or when the country is unknown", () => {
    for (const c of ["US", "IN", "CA", "BR", "JP", "", null, undefined]) {
      expect(mustAsk(c)).toBe(false);
    }
  });
});

describe("quoted price", () => {
  it("reads the price a waitlist row recorded", () => {
    expect(quotedPrice("pro-intl-b-monthly", 2900)).toBe("$29 a month");
    expect(quotedPrice("pro-in-b-annual", 499900)).toBe("₹4,999 a year");
    expect(quotedPrice(null, null)).toBeNull();
  });
});
