import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed waitlist tokens for unsubscribe links: the email, plus an HMAC made
 * with AUTH_SECRET. Anyone holding the link can leave the waitlist for that
 * address and nothing else; nobody can forge one for another address.
 */

function mac(payload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`waitlist:${payload}`)
    .digest("base64url")
    .slice(0, 32);
}

export function waitlistToken(email: string): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  const payload = Buffer.from(email.trim().toLowerCase()).toString("base64url");
  return `${payload}.${mac(payload, secret)}`;
}

/** The email a token was issued for, or null if it was tampered with. */
export function readWaitlistToken(token: string | null | undefined): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(mac(payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    return Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
}
