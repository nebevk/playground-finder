import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { routing } from "@/i18n/routing";

export default function robots(): MetadataRoute.Robots {
  const adminPaths = routing.locales.map((locale) => `/${locale}/admin`);

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...adminPaths, "/api/"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
