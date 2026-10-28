import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { MapClient } from "@/components/Map/MapClient";
import { getFavoriteIds } from "@/lib/favorites";
import { getMapSnapshot } from "@/lib/playgrounds";
import { localeAlternates } from "@/lib/seo";
import { getCurrentUser } from "@/lib/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const [tMap, tMeta] = await Promise.all([
    getTranslations({ locale, namespace: "map" }),
    getTranslations({ locale, namespace: "meta" }),
  ]);
  return { title: tMap("title"), description: tMeta("map"), alternates: localeAlternates(locale, "/map") };
}

export default async function MapPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ added?: string }>;
}) {
  const { locale } = await params;
  const { added } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("map");
  const [packed, user] = await Promise.all([getMapSnapshot(), getCurrentUser()]);
  // The visitor's own favourites, for the heart on each playground's sheet (FR-PG-04).
  const favoriteIds = user ? await getFavoriteIds(user.id) : [];

  return (
    <div className="h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] w-full md:h-dvh">
      <h1 className="sr-only">{t("title")}</h1>
      <MapClient packed={packed} addedId={added ?? null} signedIn={!!user} favoriteIds={favoriteIds} />
    </div>
  );
}
