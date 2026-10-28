import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

// The pages search engines should list (NFR-SEO-02), without the locale: Home, the map and the
// legal and about pages, plus each playground's page (`/playground/<id>`). The sitemap lists
// these, and each one links its sl and en versions with hreflang.
export const PUBLIC_PATHS = ["", "/map", "/about", "/privacy", "/terms"] as const;

/**
 * A public page's canonical URL and its hreflang alternates, for `path` without the locale ("" for
 * Home). Relative: the layout's metadataBase makes them absolute. Set on each public page, never
 * in the layout: inherited there, every other page (sign-in, profile) would name Home as its
 * canonical, which tells search engines they're copies of it.
 */
export function localeAlternates(locale: string, path: string): Metadata["alternates"] {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`])),
      "x-default": `/${routing.defaultLocale}${path}`,
    },
  };
}

/** For pages that are personal or a tool (sign-in, profile, adding): kept out of search results. */
export const NOT_LISTED: Metadata["robots"] = { index: false, follow: true };
