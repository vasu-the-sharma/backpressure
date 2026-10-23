import { CONSENT_COOKIE, mustAsk } from "@/content/pricing/consent";
import { ARMS, CONTROL_ARM, isArm } from "@/content/pricing/plans";
import { type NextRequest, NextResponse } from "next/server";

/**
 * The price test's assignment. On the pages that show a Pro price, give each
 * visitor an anonymous id and one price arm at random, and keep both in
 * cookies so they see the same price every time. The choice is also passed
 * to this request as headers, because a cookie set on the response isn't
 * visible to the page rendering it.
 *
 * Visitors from the EU, EEA, UK and Switzerland are asked first, and anyone
 * can say no from the privacy page. Without a yes where one is needed, or
 * after a no anywhere, a visitor gets no test cookies, sees the middle price
 * and isn't counted.
 */
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  // Only this middleware describes the test to the app; drop anything a client sent.
  for (const h of ["x-bp-vid", "x-bp-arm", "x-bp-consent"]) headers.delete(h);

  const consent = req.cookies.get(CONSENT_COOKIE)?.value;
  const declined = consent === "no";
  if (declined || (mustAsk(req.headers.get("x-vercel-ip-country")) && consent !== "yes")) {
    headers.set("x-bp-arm", CONTROL_ARM);
    headers.set("x-bp-consent", declined ? "declined" : "ask");
    const res = NextResponse.next({ request: { headers } });
    // Test cookies from before the visitor said no (or before we asked) go too.
    for (const name of ["bp_vid", "bp_arm"]) {
      if (req.cookies.has(name)) res.cookies.delete({ name, path: "/" });
    }
    return res;
  }

  const existingVid = req.cookies.get("bp_vid")?.value;
  const existingArm = req.cookies.get("bp_arm")?.value;
  const vid = existingVid ?? crypto.randomUUID();
  const roll = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  const arm = isArm(existingArm) ? existingArm : (ARMS[roll % ARMS.length] ?? "b");

  headers.set("x-bp-vid", vid);
  headers.set("x-bp-arm", arm);
  const res = NextResponse.next({ request: { headers } });

  const year = 60 * 60 * 24 * 365;
  const cookie = { maxAge: year, sameSite: "lax" as const, path: "/", httpOnly: true };
  if (!existingVid) res.cookies.set("bp_vid", vid, cookie);
  if (existingArm !== arm) res.cookies.set("bp_arm", arm, cookie);
  return res;
}

export const config = { matcher: ["/pricing", "/daily/archive", "/api/pricing/:path*"] };
