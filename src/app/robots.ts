import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";

/**
 * Crawl everything public; keep admin, account and API paths out. Shared
 * daily results (/daily/s/…) stay crawlable on purpose: link previews fetch
 * them, and the pages themselves say noindex.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
