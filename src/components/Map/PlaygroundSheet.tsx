"use client";

import { useTranslations } from "next-intl";
import { X, Navigation, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { RatingSummary } from "@/components/RatingSummary";
import { directionsUrl } from "@/lib/directions";
import { PLAYGROUND_FEATURE_KEYS } from "@/lib/playground-types";
import type { MapPlayground } from "@/lib/playgrounds";

export function PlaygroundSheet({
  playground,
  onClose,
}: {
  playground: MapPlayground | null;
  onClose: () => void;
}) {
  const t = useTranslations("map");
  const tDetail = useTranslations("detail");
  const open = playground !== null;

  const activeFeatures = playground
    ? PLAYGROUND_FEATURE_KEYS.filter((k) => playground[k])
    : [];

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[1100] bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={`fixed inset-x-0 bottom-0 z-[1200] mx-auto flex max-w-md flex-col rounded-t-2xl border-t border-base-300 bg-base-100 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2 shadow-xl transition-transform md:right-4 md:bottom-4 md:left-auto md:max-w-sm md:rounded-2xl md:border md:pb-5 ${
          open ? "translate-y-0" : "translate-y-full md:translate-y-[120%]"
        }`}
      >
        {playground && (
          <>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="mx-auto mb-2 h-1.5 w-10 shrink-0 rounded-full bg-base-300"
            />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold">{playground.name}</h2>
                <div className="mt-1">
                  <RatingSummary avg={playground.avg_rating} count={playground.review_count} />
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("close")}
                className="btn btn-ghost btn-sm btn-circle shrink-0"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            {playground.description && (
              <p className="mt-2 line-clamp-2 text-sm text-base-content/70">
                {playground.description}
              </p>
            )}

            {(activeFeatures.length > 0 || playground.surface_type) && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {activeFeatures.map((key) => (
                  <li key={key} className="badge badge-primary badge-sm gap-1">
                    <Check className="size-3" aria-hidden />
                    {tDetail(`feature.${key}`)}
                  </li>
                ))}
                {playground.surface_type && (
                  <li className="badge badge-outline badge-sm">
                    {tDetail(`surfaceOption.${playground.surface_type}`)}
                  </li>
                )}
              </ul>
            )}

            <div className="mt-4 flex gap-2">
              <a
                href={directionsUrl(playground.lat, playground.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm flex-1 gap-1"
              >
                <Navigation className="size-4" aria-hidden />
                {t("directions")}
              </a>
              <Link
                href={`/playground/${playground.id}`}
                className="btn btn-primary btn-sm flex-1"
              >
                {t("seeDetails")}
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
