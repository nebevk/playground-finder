import { preconnect } from "react-dom";
import { setRequestLocale } from "next-intl/server";
import { HomeLanding } from "@/components/Home/HomeLanding";
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
  // Home's map loads OpenStreetMap tiles straight away: open that connection early.
  preconnect("https://tile.openstreetmap.org");

  // The pools hold more than the 3 rows a list shows, so popular and latest can refill rows
  // that "V bližini" takes (each playground is listed once). They are ids into `points`, so
  // every playground is sent to the browser once.
  const [points, latestPool, popularPool] = await Promise.all([
    getMapPlaygrounds(),
    getLatestPlaygrounds(9),
    getMostViewedPlaygrounds(6),
  ]);

  return (
    <HomeLanding
      points={points}
      popularIds={popularPool.map((p) => p.id)}
      latestIds={latestPool.map((p) => p.id)}
    />
  );
}
