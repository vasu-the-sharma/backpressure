import { createHmac } from "node:crypto";

/**
 * Keeping bots off the waitlist without a captcha: a hidden field people never
 * fill, a minimum time to fill the form, and a cap per network per hour.
 */

/** Sign-ups sent sooner than this after the form appeared come from scripts. */
export const MIN_FILL_MS = 1500;
/** Sign-ups allowed from one network in an hour. */
export const MAX_PER_NETWORK_PER_HOUR = 5;

export type Screen = "ok" | "bot" | "rate-limited";

export function screenSignup(s: {
  trap?: string;
  elapsedMs?: number;
  recentFromNetwork: number;
}): Screen {
  if (s.trap && s.trap.trim() !== "") return "bot";
  if (s.elapsedMs !== undefined && s.elapsedMs < MIN_FILL_MS) return "bot";
  if (s.recentFromNetwork >= MAX_PER_NETWORK_PER_HOUR) return "rate-limited";
  return "ok";
}

/** The caller's IP as Vercel reports it (first hop of x-forwarded-for). */
export function clientIp(h: Headers): string | null {
  const first = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || h.get("x-real-ip") || null;
}

/**
 * A one-way fingerprint of an IP address that changes every UTC day: enough to
 * count sign-ups from one network within the hour, useless for following
 * anyone across days. The raw IP is never stored.
 */
export function networkFingerprint(ip: string | null, now: Date = new Date()): string | null {
  if (!ip) return null;
  const day = now.toISOString().slice(0, 10);
  return createHmac("sha256", process.env.AUTH_SECRET ?? "backpressure")
    .update(`${day}:${ip}`)
    .digest("base64url")
    .slice(0, 24);
}
