import { sitemapPaths } from "@/content/sitemap";
import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapPaths().map((path) => ({ url: path === "/" ? SITE_URL : `${SITE_URL}${path}` }));
}
