import { setRequestLocale, getTranslations } from "next-intl/server";
import { MapHome } from "@/components/Map/MapHome";
import {
  getMapPlaygrounds,
  getLatestPlaygrounds,
  getMostViewedPlaygrounds,
} from "@/lib/playgrounds";

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
  const [playgrounds, latestRaw, popular] = await Promise.all([
    getMapPlaygrounds(),
    getLatestPlaygrounds(6),
    getMostViewedPlaygrounds(3),
  ]);

  // Don't repeat a playground that's already shown under "most popular".
  const popularIds = new Set(popular.map((p) => p.id));
  const latest = latestRaw.filter((p) => !popularIds.has(p.id)).slice(0, 3);

  return (
    <div className="h-[calc(100dvh-5rem-env(safe-area-inset-bottom))] w-full md:h-dvh">
      <h1 className="sr-only">{t("title")}</h1>
      <MapHome
        playgrounds={playgrounds}
        latest={latest}
        popular={popular}
        addedId={added ?? null}
      />
    </div>
  );
}
