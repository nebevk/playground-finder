import { describe, expect, it } from "vitest";
import { revalidate as sitemapRevalidate } from "@/app/sitemap";
import { localeAlternates, PUBLIC_PATHS } from "@/lib/seo";

describe("search engine metadata", () => {
  it("[NFR-SEO-02] a page names itself as canonical, links every language, and x-default goes to sl", () => {
    expect(localeAlternates("en", "/map")).toEqual({
      canonical: "/en/map",
      languages: { sl: "/sl/map", en: "/en/map", "x-default": "/sl/map" },
    });
    expect(localeAlternates("sl", "")).toEqual({
      canonical: "/sl",
      languages: { sl: "/sl", en: "/en", "x-default": "/sl" },
    });
  });

  it("[NFR-SEO-02] the public pages are Home, the map, about and the legal pages", () => {
    expect([...PUBLIC_PATHS]).toEqual(["", "/map", "/about", "/privacy", "/terms"]);
  });

  it("[NFR-SEO-01] the sitemap is rebuilt at least hourly, so new and deleted playgrounds show", () => {
    // Without it, Next kept the playground query for a year (found 2026-10-28: deleted playgrounds
    // still listed, new ones missing).
    expect(sitemapRevalidate).toBeGreaterThan(0);
    expect(sitemapRevalidate).toBeLessThanOrEqual(3600);
  });
});
