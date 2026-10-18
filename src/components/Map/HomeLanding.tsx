import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/Brand";
import { MapPreviewClient } from "./MapPreviewClient";
import { NearbyPlaygrounds } from "./NearbyPlaygrounds";
import { PlaygroundCard } from "./PlaygroundCard";
import type { MapPlayground } from "@/lib/playgrounds";

// One scrolling column: the two ways in ("near me", and the map) come first, then lists.
export async function HomeLanding({
  latest,
  popular,
  points,
}: {
  latest: MapPlayground[];
  popular: MapPlayground[];
  points: MapPlayground[];
}) {
  const t = await getTranslations("home");

  return (
    <div className="h-full w-full overflow-y-auto bg-base-100">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 pt-8 pb-6 md:max-w-3xl">
        <div className="flex flex-col items-center gap-3 text-center md:hidden">
          <Wordmark className="text-4xl sm:text-5xl" />
          <p className="text-base text-base-content/80">{t("intro")}</p>
        </div>

        <div className="flex flex-col gap-3 md:max-w-md">
          <NearbyPlaygrounds playgrounds={points} />

          {/* Map teaser: shows the pins and taps through to the full map. `isolate` keeps the
              label above Leaflet's panes (z-index 400+), which otherwise paint over it. */}
          <Link href="/map" aria-label={t("explore")} className="group block">
            <div className="relative isolate h-40 overflow-hidden rounded-box border-2 border-base-300 shadow-sm sm:h-52 md:h-64">
              <div className="pointer-events-none absolute inset-0 -z-10">
                <MapPreviewClient points={points.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng }))} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="btn btn-outline gap-1 bg-base-100/95 shadow-lg transition-transform group-hover:scale-105">
                  {t("explore")}
                  <ChevronRight className="size-4" aria-hidden />
                </span>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid gap-x-6 gap-y-6 md:grid-cols-2">
          {popular.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-semibold">{t("popular")}</h2>
              <ul className="flex flex-col gap-2">
                {popular.map((p, i) => (
                  <li key={p.id}>
                    <PlaygroundCard p={p} index={i} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-2 text-lg font-semibold">{t("latest")}</h2>
            {latest.length === 0 ? (
              <p className="text-sm text-base-content/70">{t("noLatest")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {latest.map((p, i) => (
                  <li key={p.id}>
                    <PlaygroundCard p={p} index={i} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
