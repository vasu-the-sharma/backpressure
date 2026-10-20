/**
 * The site's absolute origin: the production domain on Vercel (also used by
 * previews, so links in emails and sitemaps always point at production), and
 * localhost elsewhere.
 */
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";
