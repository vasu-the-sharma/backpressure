import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmails, waitlistConfirmation, waitlistEmail } from "./email";
import { readWaitlistToken } from "./tokens";

describe("waitlist email", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Backpressure <hello@example.com>");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("fills in the quoted price, says why it was sent, and offers one-click leave", () => {
    const e = waitlistEmail(
      "ada@example.com",
      "pro",
      "Pro is open",
      "Yours: {price}.",
      "$29 a month",
    );
    expect(e?.text).toContain("Yours: $29 a month.");
    expect(e?.text).toContain(
      "You're getting this because you joined the Backpressure Pro waitlist.",
    );
    const page = e?.text.match(/Leave the waitlist: (\S+)/)?.[1] ?? "";
    expect(readWaitlistToken(new URL(page).searchParams.get("t"))).toBe("ada@example.com");
    expect(e?.headers?.["List-Unsubscribe"]).toMatch(/^<.+\/api\/waitlist\/unsubscribe\?t=.+>$/);
    expect(e?.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("mentions the first-year price in the confirmation only when one was shown", () => {
    expect(waitlistConfirmation("a@example.com", "pro", "₹999 a month")?.text).toContain(
      "You'll keep the price you saw, ₹999 a month, for your first year.",
    );
    const teams = waitlistConfirmation("a@example.com", "teams", null);
    expect(teams?.subject).toBe("You're on the Backpressure Teams waitlist");
    expect(teams?.text).not.toContain("first year");
  });

  it("sends in batches of 100 and counts a failed batch", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const emails = Array.from({ length: 250 }, (_, i) => ({
      to: `p${i}@example.com`,
      subject: "Hi",
      text: "Hello",
    }));
    expect(await sendEmails(emails)).toEqual({ sent: 150, failed: 100 });
    expect(fetch).toHaveBeenCalledTimes(3);
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("https://api.resend.com/emails/batch");
    expect(JSON.parse(init.body)).toHaveLength(100);
    expect(init.headers.Authorization).toBe("Bearer re_test");
  });

  it("sends nothing when email isn't configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await sendEmails([{ to: "a@example.com", subject: "s", text: "t" }])).toEqual({
      sent: 0,
      failed: 1,
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
