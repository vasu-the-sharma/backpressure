import { SITE_URL } from "@/lib/site";
import { waitlistToken } from "./tokens";

/**
 * Email through Resend's HTTP API. Plain text only: the messages are short,
 * personal and transactional, and plain text reads well everywhere.
 */

const API = "https://api.resend.com";
const BATCH = 100;

export interface Email {
  to: string;
  subject: string;
  text: string;
  headers?: Record<string, string>;
}

/** Send in batches of 100; a failed batch is counted, not retried. */
export async function sendEmails(emails: Email[]): Promise<{ sent: number; failed: number }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { sent: 0, failed: emails.length };
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < emails.length; i += BATCH) {
    const chunk = emails.slice(i, i + BATCH);
    try {
      const res = await fetch(`${API}/emails/batch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(
          chunk.map((e) => ({
            from,
            to: [e.to],
            subject: e.subject,
            text: e.text,
            headers: e.headers,
          })),
        ),
      });
      if (res.ok) sent += chunk.length;
      else failed += chunk.length;
    } catch {
      failed += chunk.length;
    }
  }
  return { sent, failed };
}

/** The two ways out of the waitlist: a page with a button, and a one-click POST for mail apps. */
export function leaveLinks(email: string): { page: string; oneClick: string } | null {
  const t = waitlistToken(email);
  if (!t) return null;
  const q = `t=${encodeURIComponent(t)}`;
  return {
    page: `${SITE_URL}/waitlist/leave?${q}`,
    oneClick: `${SITE_URL}/api/waitlist/unsubscribe?${q}`,
  };
}

const PLAN_NAME: Record<string, string> = { pro: "Backpressure Pro", teams: "Backpressure Teams" };

/**
 * Wrap a message for one waitlist member: their quoted price in place of
 * {price}, a footer saying why they got it, and RFC 8058 one-click
 * unsubscribe headers (which Gmail and Yahoo require for bulk mail).
 */
export function waitlistEmail(
  to: string,
  plan: string,
  subject: string,
  body: string,
  price: string | null,
): Email | null {
  const links = leaveLinks(to);
  if (!links) return null;
  const name = PLAN_NAME[plan] ?? "Backpressure";
  const text = [
    body.replaceAll("{price}", price ?? "the launch price").trim(),
    "",
    "—",
    `You're getting this because you joined the ${name} waitlist.`,
    `Leave the waitlist: ${links.page}`,
  ].join("\n");
  return {
    to,
    subject,
    text,
    headers: {
      "List-Unsubscribe": `<${links.oneClick}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

/** The note someone gets right after joining. */
export function waitlistConfirmation(to: string, plan: string, price: string | null): Email | null {
  const name = PLAN_NAME[plan] ?? "Backpressure";
  const lines = [
    `Thanks for joining the ${name} waitlist.`,
    "",
    "We'll email you once when it opens. That's the only email we'll send about it.",
  ];
  if (price) lines.push("", `You'll keep the price you saw, {price}, for your first year.`);
  return waitlistEmail(to, plan, `You're on the ${name} waitlist`, lines.join("\n"), price);
}
