"use client";

import { useEffect, useId, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X, Navigation } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { RatingSummary } from "@/components/RatingSummary";
import { FEATURE_ICONS, FeatureBadge, SURFACE_ICON } from "@/components/FeatureChip";
import { useUserLocation } from "@/components/Location/UserLocationContext";
import { directionsUrl } from "@/lib/directions";
import { formatDistance } from "@/lib/geo";
import { PLAYGROUND_FEATURE_KEYS } from "@/lib/playground-types";
import type { MapPlayground } from "@/lib/playgrounds";

// Non-modal sheet (design critique, BL-54): no backdrop, the map stays usable, tapping another
// pin swaps the content, and the selected pin is panned above it (PlaygroundMap → SheetSync).
// Sits inside the map, so the bottom nav stays visible below it.
export function PlaygroundSheet({
  playground,
  onClose,
  onHeight,
}: {
  playground: MapPlayground | null;
  onClose: () => void;
  onHeight: (px: number) => void;
}) {
  const t = useTranslations("map");
  const tDetail = useTranslations("detail");
  const locale = useLocale();
  const { distanceTo } = useUserLocation();
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const open = playground !== null;

  // Report the sheet's height so the map controls and the selected pin stay above it.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => onHeight(open ? el.offsetHeight : 0));
    ro.observe(el);
    onHeight(open ? el.offsetHeight : 0);
    return () => ro.disconnect();
  }, [open, onHeight]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const activeFeatures = playground ? PLAYGROUND_FEATURE_KEYS.filter((k) => playground[k]) : [];
  const distance = playground ? distanceTo(playground.lat, playground.lng) : null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-hidden={!open}
      inert={!open}
      className={`absolute inset-x-0 bottom-0 z-1100 mx-auto flex max-w-md flex-col rounded-t-2xl border-t border-base-300 bg-base-100 px-5 pt-2 pb-4 shadow-[0_-4px_16px_rgb(0_0_0/0.12)] transition-transform md:right-4 md:bottom-4 md:left-auto md:max-w-sm md:rounded-2xl md:border ${
        open ? "translate-y-0" : "pointer-events-none translate-y-full md:translate-y-[120%]"
      }`}
    >
      {playground && (
        <>
          <div aria-hidden className="mx-auto mb-1 h-1.5 w-10 shrink-0 rounded-full bg-base-300" />

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pt-2">
              <h2 id={titleId} className="truncate text-xl font-bold">
                {playground.name}
              </h2>
              {(playground.review_count > 0 || distance !== null) && (
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  {playground.review_count > 0 && (
                    <RatingSummary avg={playground.avg_rating} count={playground.review_count} />
                  )}
                  {distance !== null && (
                    <span className="text-base-content/70">
                      {t("distanceAway", { distance: formatDistance(distance, locale) })}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button type="button" onClick={onClose} aria-label={t("close")} className="btn btn-ghost btn-circle shrink-0">
              <X className="size-5" aria-hidden />
            </button>
          </div>

          {playground.description && (
            <p className="mt-2 line-clamp-2 text-sm text-base-content/70">{playground.description}</p>
          )}

          {(activeFeatures.length > 0 || playground.surface_type) && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {activeFeatures.map((key) => (
                <FeatureBadge key={key} icon={FEATURE_ICONS[key]} label={tDetail(`feature.${key}`)} />
              ))}
              {playground.surface_type && (
                <FeatureBadge icon={SURFACE_ICON} label={tDetail(`surfaceOption.${playground.surface_type}`)} />
              )}
            </ul>
          )}

          <div className="mt-4 flex gap-2">
            <a
              href={directionsUrl(playground.lat, playground.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline flex-1 gap-1"
            >
              <Navigation className="size-4" aria-hidden />
              {t("directions")}
            </a>
            <Link href={`/playground/${playground.id}`} className="btn btn-primary flex-1">
              {t("seeDetails")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
