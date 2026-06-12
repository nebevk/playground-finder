import { getTranslations } from "next-intl/server";
import { ChevronRight, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/Brand";
import { RatingSummary } from "@/components/RatingSummary";
import { MapPreviewClient } from "./MapPreviewClient";
import type { MapPlayground } from "@/lib/playgrounds";

// Each card gets a different rainbow accent (left stripe + matching pin), cycled by
// position. Decorative only — the stripe carries no meaning, so contrast isn't a concern.
const CARD_ACCENTS = [
  { stripe: "border-l-primary", icon: "text-primary" },
  { stripe: "border-l-secondary", icon: "text-secondary" },
  { stripe: "border-l-info", icon: "text-info" },
  { stripe: "border-l-success", icon: "text-success" },
  { stripe: "border-l-warning", icon: "text-warning" },
] as const;

function PlaygroundCard({ p, index }: { p: MapPlayground; index: number }) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  return (
    <Link
      href={`/playground/${p.id}`}
      className={`flex items-center gap-3 rounded-box border-l-4 ${accent.stripe} bg-base-200/60 p-3 shadow-sm transition-colors hover:bg-base-200`}
    >
      <span className={accent.icon}>
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
              <p className="text-sm text-base-content/60">{t("noLatest")}</p>
            ) : (
              <ul className="flex flex-col gap-2 pb-2">
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

      {/* Map teaser — shows the pins; taps through to the full map. Taller on desktop. */}
      <div className="shrink-0 px-4 pt-2 pb-4">
        <Link href="/map" aria-label={t("explore")} className="group block">
          <div className="relative h-44 overflow-hidden rounded-box border-2 border-base-300 shadow-sm sm:h-56 md:h-72 lg:h-[28rem]">
            <div className="pointer-events-none absolute inset-0">
              <MapPreviewClient points={points.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng }))} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="btn btn-primary gap-1 shadow-lg transition-transform group-hover:scale-105">
                {t("explore")}
                <ChevronRight className="size-4" aria-hidden />
              </span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
