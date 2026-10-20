import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readWaitlistToken, waitlistToken } from "./tokens";

describe("waitlist tokens", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips the address, lower-cased", () => {
    const t = waitlistToken(" Ada@Example.com ");
    expect(t).not.toBeNull();
    expect(readWaitlistToken(t)).toBe("ada@example.com");
  });

  it("rejects a token for another address or a changed signature", () => {
    const t = waitlistToken("ada@example.com") ?? "";
    const [, sig] = t.split(".");
    const forged = `${Buffer.from("eve@example.com").toString("base64url")}.${sig}`;
    expect(readWaitlistToken(forged)).toBeNull();
    expect(readWaitlistToken(`${t.slice(0, -1)}x`)).toBeNull();
    expect(readWaitlistToken("garbage")).toBeNull();
    expect(readWaitlistToken(null)).toBeNull();
  });

  it("rejects tokens signed with a different secret, and issues none without one", () => {
    const t = waitlistToken("ada@example.com");
    vi.stubEnv("AUTH_SECRET", "rotated");
    expect(readWaitlistToken(t)).toBeNull();
    vi.stubEnv("AUTH_SECRET", "");
    expect(waitlistToken("ada@example.com")).toBeNull();
  });
});
