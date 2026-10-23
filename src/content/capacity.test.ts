import { describe, expect, it } from "vitest";
import { DEFAULT_INPUT, planCapacity, slowdownAt } from "./capacity";

describe("capacity planning", () => {
  it("turns daily users into peak load and servers with headroom", () => {
    const p = planCapacity(DEFAULT_INPUT);
    // 10M users × 20 requests ÷ 86,400 s ≈ 2,315 rps; ×3 at the peak ≈ 6,944 rps.
    expect(Math.round(p.averageRps)).toBe(2315);
    expect(Math.round(p.peakRps)).toBe(6944);
    // 7 servers would be 99% busy; staying at or under 70% takes 10.
    expect(p.serversAtFull).toBe(7);
    expect(p.servers).toBe(10);
    expect(p.utilisation).toBeLessThanOrEqual(0.7);
    expect(p.utilisation).toBeCloseTo(0.694, 3);
  });

  it("sizes storage from the share of requests that write", () => {
    const p = planCapacity(DEFAULT_INPUT);
    // 2,315 rps × 10% writes × 1 KB ≈ 20 GB a day.
    expect(p.writesPerSecond).toBeCloseTo(231.5, 1);
    expect(p.bytesPerDay / 1e9).toBeCloseTo(20, 0);
    expect(p.bytesPerYear).toBeCloseTo(p.bytesPerDay * 365);
  });

  it("never plans zero servers, and never runs past the target", () => {
    const tiny = planCapacity({ ...DEFAULT_INPUT, dailyActiveUsers: 10, serverRps: 50_000 });
    expect(tiny.servers).toBe(1);
    for (const target of [0.5, 0.7, 0.85, 0.95]) {
      const p = planCapacity({ ...DEFAULT_INPUT, targetUtilisation: target });
      expect(p.utilisation).toBeLessThanOrEqual(target + 1e-12);
    }
  });

  it("waits grow like 1 / (1 − utilisation)", () => {
    expect(slowdownAt(0)).toBe(1);
    expect(slowdownAt(0.5)).toBe(2);
    expect(slowdownAt(0.9)).toBeCloseTo(10);
    expect(slowdownAt(0.99)).toBeCloseTo(100);
    expect(slowdownAt(1)).toBe(Number.POSITIVE_INFINITY);
  });
});
