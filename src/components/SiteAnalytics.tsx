"use client";

import { Analytics } from "@vercel/analytics/next";

/**
 * Vercel Web Analytics: page views, no cookies. Each URL is cut at "?" or
 * "#" before it's sent, so links that carry a token (leaving the waitlist)
 * never reach the analytics, and admin pages aren't counted at all.
 */
export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url);
        if (url.pathname.startsWith("/admin")) return null;
        return { ...event, url: `${url.origin}${url.pathname}` };
      }}
    />
  );
}
