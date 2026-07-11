import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

// A single manifest is generated for the primary locale. Branding comes from
// i18n keys so the working name stays swappable (see CLAUDE.md).
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "app" });

  return {
    name: t("name"),
    short_name: t("shortName"),
    description: t("slogan"),
    start_url: `/${routing.defaultLocale}`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf7fb",
    theme_color: "#8e4ae2",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
