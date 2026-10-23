import { describe, expect, it } from "vitest";
import { getAllSlugs } from "./registry";
import { sitemapPaths } from "./sitemap";

describe("sitemap", () => {
  const paths = sitemapPaths();

  it("lists the public pages and every system", () => {
    for (const p of ["/", "/pricing", "/daily", "/privacy", "/terms"]) expect(paths).toContain(p);
    for (const s of getAllSlugs()) expect(paths).toContain(`/systems/${s}`);
  });

  it("leaves out private and noindex pages, with no duplicates", () => {
    expect(paths.some((p) => /^\/(admin|account|signin|api|daily\/s\/|waitlist)/.test(p))).toBe(
      false,
    );
    expect(new Set(paths).size).toBe(paths.length);
  });
});
