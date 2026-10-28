import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/site";
import { PUBLIC_PATHS } from "@/lib/seo";
import { routing } from "@/i18n/routing";

// Rebuilt at most hourly, like the map snapshot. Without this, Next cached the playground query
// for a year: the sitemap kept listing deleted playgrounds and never listed new ones.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  // Each entry also names its other language versions (hreflang), as the pages themselves do.
  const languages = (path: string) => ({
    ...Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}${path}`])),
    "x-default": `${base}/${routing.defaultLocale}${path}`,
  });

  const entries: MetadataRoute.Sitemap = routing.locales.flatMap((locale) =>
    PUBLIC_PATHS.map((path) => ({
      url: `${base}/${locale}${path}`,
      changeFrequency: path === "" || path === "/map" ? ("daily" as const) : ("monthly" as const),
      priority: path === "" ? 1 : 0.7,
      alternates: { languages: languages(path) },
    })),
  );

  // Sitemaps render outside a request scope (no cookies), so use a plain
  // anon client instead of the cookie-bound server client. RLS hides
  // flagged playgrounds from the anon role.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  const { data } = await supabase
    .from("playgrounds_geo")
    .select("id, created_at")
    .limit(5000);

  for (const row of data ?? []) {
    if (!row.id) continue;
    const path = `/playground/${row.id}`;
    for (const locale of routing.locales) {
      entries.push({
        url: `${base}/${locale}${path}`,
        lastModified: row.created_at ?? undefined,
        changeFrequency: "weekly",
        priority: 0.6,
        alternates: { languages: languages(path) },
      });
    }
  }

  return entries;
}
