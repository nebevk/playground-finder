import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/site";
import { routing } from "@/i18n/routing";

const STATIC_PATHS = ["", "/map", "/about", "/privacy", "/terms"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  const entries: MetadataRoute.Sitemap = routing.locales.flatMap((locale) =>
    STATIC_PATHS.map((path) => ({
      url: `${base}/${locale}${path}`,
      changeFrequency: path === "" || path === "/map" ? ("daily" as const) : ("monthly" as const),
      priority: path === "" ? 1 : 0.7,
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
    for (const locale of routing.locales) {
      entries.push({
        url: `${base}/${locale}/playground/${row.id}`,
        lastModified: row.created_at ?? undefined,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
