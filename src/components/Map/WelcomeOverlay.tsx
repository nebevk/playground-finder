"use client";

import { useTranslations } from "next-intl";
import { ChevronRight, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/Brand";
import { RatingSummary } from "@/components/RatingSummary";
import { StaticMapClient } from "./StaticMapClient";
import type { MapPlayground } from "@/lib/playgrounds";

const LJUBLJANA = { lat: 46.0569, lng: 14.5058 };

function PlaygroundCard({ p }: { p: MapPlayground }) {
  return (
    <Link
      href={`/playground/${p.id}`}
      className="flex items-center gap-3 rounded-box border border-base-300 bg-base-200/50 p-3 transition-colors hover:bg-base-200"
    >
      <span className="text-primary">
        <MapPin className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{p.name}</span>
        <RatingSummary avg={p.avg_rating} count={p.review_count} />
      </span>
      <ChevronRight className="size-4 shrink-0 text-base-content/40" aria-hidden />
    </Link>
  );
}

export function WelcomeOverlay({
  latest,
  popular,
  onExplore,
}: {
  latest: MapPlayground[];
  popular: MapPlayground[];
  onExplore: () => void;
}) {
  const t = useTranslations("home");

  const center =
    latest.length > 0
      ? {
          lat: latest.reduce((s, p) => s + p.lat, 0) / latest.length,
          lng: latest.reduce((s, p) => s + p.lng, 0) / latest.length,
        }
      : LJUBLJANA;

  return (
    <div className="flex h-full w-full flex-col bg-base-100">
      <div className="flex-1 overflow-y-auto px-4 pt-8">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
          <Wordmark className="text-4xl sm:text-5xl" />
          <p className="text-base text-base-content/80">{t("intro")}</p>
        </div>

        <div className="mx-auto mt-7 max-w-md">
          {popular.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2 text-lg font-semibold">{t("popular")}</h2>
              <ul className="flex flex-col gap-2">
                {popular.map((p) => (
                  <li key={p.id}>
                    <PlaygroundCard p={p} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-2 text-lg font-semibold">{t("latest")}</h2>
            {latest.length === 0 ? (
              <p className="text-sm text-base-content/60">{t("noLatest")}</p>
            ) : (
              <ul className="flex flex-col gap-2 pb-2">
                {latest.map((p) => (
                  <li key={p.id}>
                    <PlaygroundCard p={p} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Map preview — a cropped, rounded rectangle. Tap to open the full map. */}
      <div className="shrink-0 px-4 pt-2 pb-4">
        <button
          type="button"
          onClick={onExplore}
          aria-label={t("explore")}
          className="group block w-full"
        >
          <div className="relative h-44 overflow-hidden rounded-box border-2 border-base-300 shadow-sm sm:h-56">
            <div className="pointer-events-none absolute inset-0">
              <StaticMapClient lat={center.lat} lng={center.lng} zoom={11} marker={false} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="btn btn-primary gap-1 shadow-lg transition-transform group-hover:scale-105">
                {t("explore")}
                <ChevronRight className="size-4" aria-hidden />
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
