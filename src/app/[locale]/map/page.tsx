import { setRequestLocale, getTranslations } from "next-intl/server";
import { MapClient } from "@/components/Map/MapClient";
import { getMapPlaygrounds } from "@/lib/playgrounds";

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
  const playgrounds = await getMapPlaygrounds();

  return (
    <div className="h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] w-full md:h-dvh">
      <h1 className="sr-only">{t("title")}</h1>
      <MapClient playgrounds={playgrounds} addedId={added ?? null} />
    </div>
  );
}
