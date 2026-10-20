"use client";

import { memo } from "react";
import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RatingSummary } from "@/components/RatingSummary";
import { formatDistance } from "@/lib/geo";
import { PLAYGROUND_FEATURE_KEYS, type MapPlayground } from "@/lib/playground-types";

// One Home list row (a DaisyUI list-row; the whole row is the link): name, then the rating and
// the features on one muted line, then the distance once the visitor has located. Rows are told
// apart by their names: no colour stripes, icon tiles or card boxes. The one colour is the rank
// disc in "V bližini", which matches the numbered pin on the map. On desktop, hovering or
// focusing a row lights up its pin (`onActivate`), and `active` tints the row while its pin is
// hovered.
export const PlaygroundRow = memo(function PlaygroundRow({
  p,
  distance,
  rank,
  active = false,
  onActivate,
}: {
  p: MapPlayground;
  /** Metres from the visitor; null before they locate. */
  distance: number | null;
  /** 1-based position in "V bližini". */
  rank?: number;
  active?: boolean;
  onActivate?: (id: string | null, from: "pointer" | "focus") => void;
}) {
  const tDetail = useTranslations("detail");
  const locale = useLocale();
  const rated = p.review_count > 0 && p.avg_rating != null;
  const features = PLAYGROUND_FEATURE_KEYS.filter((k) => p[k]).map((k) => tDetail(`feature.${k}`));

  return (
    <li>
      <Link
        href={`/playground/${p.id}`}
        data-active={active || undefined}
        onPointerEnter={onActivate && ((e) => e.pointerType === "mouse" && onActivate(p.id, "pointer"))}
        onPointerLeave={onActivate && ((e) => e.pointerType === "mouse" && onActivate(null, "pointer"))}
        onFocus={onActivate && (() => onActivate(p.id, "focus"))}
        onBlur={onActivate && (() => onActivate(null, "focus"))}
        className="list-row min-h-16 items-center gap-3 px-2 py-2.5 transition-colors hover:bg-base-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary active:bg-base-200 data-active:bg-base-200"
      >
        {rank !== undefined && (
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold tabular-nums text-primary-content"
          >
            {rank}
          </span>
        )}
        <span className="list-col-grow min-w-0">
          <span className="block truncate text-base leading-snug font-semibold">{p.name}</span>
          {(rated || features.length > 0) && (
            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-base-content/70">
              {rated && <RatingSummary variant="compact" avg={p.avg_rating} count={p.review_count} />}
              {rated && features.length > 0 && <span aria-hidden>·</span>}
              {features.length > 0 && <span className="min-w-0 truncate">{features.join(" · ")}</span>}
            </span>
          )}
        </span>
        {distance !== null && (
          <span
            className={
              rank !== undefined
                ? "text-base font-bold whitespace-nowrap tabular-nums text-base-content"
                : "text-sm font-semibold whitespace-nowrap tabular-nums text-base-content/80"
            }
          >
            {formatDistance(distance, locale)}
          </span>
        )}
        <ChevronRight className="size-4 shrink-0 text-base-content/60" aria-hidden />
      </Link>
    </li>
  );
});
