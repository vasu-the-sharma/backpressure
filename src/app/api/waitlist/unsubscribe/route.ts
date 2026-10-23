import { getDb } from "@/db";
import { isDbConfigured } from "@/server/config";
import { leaveWaitlist } from "@/server/daily";
import { readWaitlistToken } from "@/server/tokens";

/**
 * One-click unsubscribe (RFC 8058). Mail apps POST here from the
 * List-Unsubscribe header in every waitlist email, with no cookies; the
 * signed token in the URL says who is leaving.
 */
export async function POST(req: Request) {
  const email = readWaitlistToken(new URL(req.url).searchParams.get("t"));
  if (!email) return new Response("This link isn't valid.", { status: 400 });
  if (!isDbConfigured()) return new Response("Try again later.", { status: 503 });
  await leaveWaitlist(getDb(), email);
  return new Response("You've left the waitlist.", { status: 200 });
}

/** Opening the link in a browser (or a mail scanner fetching it) only shows the page with the button. */
export function GET(req: Request) {
  const url = new URL(req.url);
  const target = new URL("/waitlist/leave", url);
  const t = url.searchParams.get("t");
  if (t) target.searchParams.set("t", t);
  return Response.redirect(target, 303);
}
