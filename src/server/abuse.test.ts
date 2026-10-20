import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_PER_NETWORK_PER_HOUR,
  MIN_FILL_MS,
  clientIp,
  networkFingerprint,
  screenSignup,
} from "./abuse";

describe("sign-up screening", () => {
  it("lets a person through", () => {
    expect(screenSignup({ trap: "", elapsedMs: 4000, recentFromNetwork: 0 })).toBe("ok");
    expect(screenSignup({ recentFromNetwork: 0 })).toBe("ok");
  });

  it("flags a filled hidden field or a form sent too fast", () => {
    expect(screenSignup({ trap: "https://spam.example", recentFromNetwork: 0 })).toBe("bot");
    expect(screenSignup({ elapsedMs: MIN_FILL_MS - 1, recentFromNetwork: 0 })).toBe("bot");
    expect(screenSignup({ elapsedMs: MIN_FILL_MS, recentFromNetwork: 0 })).toBe("ok");
  });

  it("caps sign-ups per network per hour", () => {
    expect(screenSignup({ recentFromNetwork: MAX_PER_NETWORK_PER_HOUR - 1 })).toBe("ok");
    expect(screenSignup({ recentFromNetwork: MAX_PER_NETWORK_PER_HOUR })).toBe("rate-limited");
  });
});

describe("network fingerprint", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads the first forwarded hop, then x-real-ip", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe(
      "203.0.113.7",
    );
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBeNull();
  });

  it("is stable within a UTC day, changes the next day, and never contains the IP", () => {
    const morning = new Date("2026-10-20T01:00:00Z");
    const evening = new Date("2026-10-20T23:00:00Z");
    const tomorrow = new Date("2026-10-21T01:00:00Z");
    const a = networkFingerprint("203.0.113.7", morning);
    expect(a).toBe(networkFingerprint("203.0.113.7", evening));
    expect(a).not.toBe(networkFingerprint("203.0.113.7", tomorrow));
    expect(a).not.toBe(networkFingerprint("203.0.113.8", morning));
    expect(a).not.toContain("203");
    expect(networkFingerprint(null)).toBeNull();
  });
});
