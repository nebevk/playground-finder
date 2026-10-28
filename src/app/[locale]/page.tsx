import type { Metadata } from "next";
import { preconnect } from "react-dom";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomeLanding } from "@/components/Home/HomeLanding";
import { getLatestPlaygroundIds, getMapSnapshot, getMostViewedPlaygroundIds } from "@/lib/playgrounds";
import { localeAlternates } from "@/lib/seo";

// The title stays the layout's default: the app's name.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { description: t("home"), alternates: localeAlternates(locale, "") };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Home's map loads OpenStreetMap tiles straight away: open that connection early.
  preconnect("https://tile.openstreetmap.org");

  // The pools hold more than the 3 rows a list shows, so popular and latest can refill rows
  // that "V bližini" takes (each playground is listed once). They are ids into `points`, so
  // every playground is sent to the browser once.
  const [packed, latestIds, popularIds] = await Promise.all([
    getMapSnapshot(),
    getLatestPlaygroundIds(9),
    getMostViewedPlaygroundIds(6),
  ]);

  return (
    <HomeLanding
      packed={packed}
      popularIds={popularIds}
      latestIds={latestIds}
    />
  );
}
