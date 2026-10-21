"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X, Navigation } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LinkPending } from "@/components/LinkPending";
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
  onLift,
}: {
  playground: MapPlayground | null;
  onClose: () => void;
  onLift: (px: number) => void;
}) {
  const t = useTranslations("map");
  const tDetail = useTranslations("detail");
  const locale = useLocale();
  const { distanceTo } = useUserLocation();
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const open = playground !== null;
  // Keep the last playground rendered while the sheet slides out, so it leaves at full height
  // instead of collapsing to an empty strip first.
  const [last, setLast] = useState(playground);
  if (playground !== null && playground !== last) setLast(playground);
  const p = playground ?? last;

  // Report how far the sheet reaches up from the map's bottom edge (its height plus its bottom
  // offset), so the map controls and the selected pin stay above it.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const report = () => onLift(open ? el.offsetHeight + parseFloat(getComputedStyle(el).bottom) : 0);
    const ro = new ResizeObserver(report);
    ro.observe(el);
    report();
    return () => ro.disconnect();
  }, [open, onLift]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const activeFeatures = p ? PLAYGROUND_FEATURE_KEYS.filter((k) => p[k]) : [];
  const distance = p ? distanceTo(p.lat, p.lng) : null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-hidden={!open}
      inert={!open}
      // Closed, it is also invisible: the visibility flips once the slide-out ends, so the sheet
      // can never paint over the bottom nav or peek out of the map (the map root clips it too).
      className={`absolute inset-x-0 bottom-0 z-1100 mx-auto flex max-w-md flex-col rounded-t-2xl border-t border-base-300 bg-base-100 px-5 pt-4 pb-4 shadow-[0_-4px_16px_rgb(0_0_0/0.12)] transition-[translate,visibility] duration-200 md:right-4 md:bottom-4 md:left-auto md:max-w-sm md:rounded-2xl md:border ${
        open ? "visible translate-y-0" : "pointer-events-none invisible translate-y-full md:translate-y-[calc(100%+1rem)]"
      }`}
    >
      {p && (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pt-2">
              <h2 id={titleId} className="truncate text-xl font-bold">
                {p.name}
              </h2>
              {(p.review_count > 0 || distance !== null) && (
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  {p.review_count > 0 && (
                    <RatingSummary avg={p.avg_rating} count={p.review_count} />
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

          {p.description && (
            <p className="mt-2 line-clamp-2 text-sm text-base-content/70">{p.description}</p>
          )}

          {(activeFeatures.length > 0 || p.surface_type) && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {activeFeatures.map((key) => (
                <FeatureBadge key={key} icon={FEATURE_ICONS[key]} label={tDetail(`feature.${key}`)} />
              ))}
              {p.surface_type && (
                <FeatureBadge icon={SURFACE_ICON} label={tDetail(`surfaceOption.${p.surface_type}`)} />
              )}
            </ul>
          )}

          <div className="mt-4 flex gap-2">
            <a
              href={directionsUrl(p.lat, p.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline flex-1 gap-1"
            >
              <Navigation className="size-4" aria-hidden />
              {t("directions")}
            </a>
            <Link href={`/playground/${p.id}`} className="btn btn-primary flex-1">
              <LinkPending />
              {t("seeDetails")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
