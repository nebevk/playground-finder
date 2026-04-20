import { setRequestLocale, getTranslations } from "next-intl/server";
import { MapClient } from "@/components/Map/MapClient";
import { getMapPlaygrounds } from "@/lib/playgrounds";

export default async function MapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("map");
  const playgrounds = await getMapPlaygrounds();

  return (
    <div className="h-[calc(100dvh-5rem)] w-full md:h-dvh">
      <h1 className="sr-only">{t("title")}</h1>
      <MapClient playgrounds={playgrounds} />
    </div>
  );
}
