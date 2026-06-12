import { setRequestLocale } from "next-intl/server";
import { HomeLanding } from "@/components/Map/HomeLanding";
import {
  getMapPlaygrounds,
  getLatestPlaygrounds,
  getMostViewedPlaygrounds,
} from "@/lib/playgrounds";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [points, latestRaw, popular] = await Promise.all([
    getMapPlaygrounds(),
    getLatestPlaygrounds(6),
    getMostViewedPlaygrounds(3),
  ]);

  // Don't repeat a playground that's already shown under "most popular".
  const popularIds = new Set(popular.map((p) => p.id));
  const latest = latestRaw.filter((p) => !popularIds.has(p.id)).slice(0, 3);

  return (
    <div className="h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] w-full md:h-dvh">
      <HomeLanding latest={latest} popular={popular} points={points} />
    </div>
  );
}
