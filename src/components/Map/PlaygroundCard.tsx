"use client";

import { ChevronRight, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RatingSummary } from "@/components/RatingSummary";
import { useUserLocation } from "@/components/Location/UserLocationContext";
import { formatDistance } from "@/lib/geo";
import { PLAYGROUND_FEATURE_KEYS } from "@/lib/playground-types";
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

// Second line: the rating once there is one; until then the features (instead of a row of
// "Še ni ocen"). Distance appears once the visitor has shared their location.
export function PlaygroundCard({ p, index }: { p: MapPlayground; index: number }) {
  const tDetail = useTranslations("detail");
  const locale = useLocale();
  const { distanceTo } = useUserLocation();
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  const distance = distanceTo(p.lat, p.lng);
  const features = PLAYGROUND_FEATURE_KEYS.filter((k) => p[k]).map((k) => tDetail(`feature.${k}`));

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
        {p.review_count > 0 ? (
          <RatingSummary avg={p.avg_rating} count={p.review_count} />
        ) : (
          features.length > 0 && (
            <span className="block truncate text-sm text-base-content/70">{features.join(" · ")}</span>
          )
        )}
      </span>
      {distance !== null && (
        <span className="shrink-0 text-sm font-semibold text-base-content/80">{formatDistance(distance, locale)}</span>
      )}
      <ChevronRight className="size-4 shrink-0 text-base-content/60" aria-hidden />
    </Link>
  );
}
