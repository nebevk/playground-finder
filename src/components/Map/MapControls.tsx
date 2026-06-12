"use client";

import { useMap } from "react-leaflet";
import { useTranslations } from "next-intl";
import { LocateFixed, Minus, Plus, Settings2, SlidersHorizontal, X } from "lucide-react";
import { useFilters } from "@/components/Filters/FiltersContext";

// A single DaisyUI FAB (speed dial) that gathers every map control into one corner:
// zoom, locate, and filters. Rendered inside <MapContainer> so `useMap()` works; the
// Filters drawer is reached through context. `!absolute` overrides the component's
// default `position: fixed` so the cluster stays pinned to the map (and clears the
// bottom dock on mobile, since the map already ends above it).
export function MapControls() {
  const map = useMap();
  const t = useTranslations("map");
  const tf = useTranslations("filters");
  const { setOpen, activeCount } = useFilters();

  function locate() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 15),
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div
      className="fab absolute! right-4 bottom-4 z-1000"
      onKeyDown={(e) => {
        // Escape collapses the dial: blurring drops `.fab`'s `:focus-within`.
        if (e.key === "Escape") (document.activeElement as HTMLElement | null)?.blur();
      }}
    >
      {/* Closed state: the trigger. The FAB opens on `:focus-within`, but iOS Safari
          doesn't focus controls on tap — so we force focus in the click handler.
          `tabIndex` is required for the daisyUI `[tabindex]:first-child` selector. */}
      <button
        type="button"
        tabIndex={0}
        aria-label={t("controls")}
        onClick={(e) => e.currentTarget.focus()}
        className="btn btn-circle btn-lg btn-primary shadow-lg"
      >
        <Settings2 className="size-5" aria-hidden />
      </button>

      {/* Open state: the trigger is swapped for this close affordance. It must be a real
          focusable button with an explicit blur — on iOS tapping an inert element doesn't
          drop focus, so an inert X would leave the dial stuck open. */}
      <button
        type="button"
        aria-label={t("close")}
        onClick={() => (document.activeElement as HTMLElement | null)?.blur()}
        className="fab-close btn btn-circle btn-lg btn-primary shadow-lg"
      >
        <X className="size-5" aria-hidden />
      </button>

      <div>
        <span className="rounded-field bg-base-100/90 px-2 py-1 text-sm font-medium shadow">
          {t("zoomIn")}
        </span>
        <button
          type="button"
          onClick={(e) => {
            map.zoomIn();
            e.currentTarget.focus(); // keep the dial open for repeated taps
          }}
          aria-label={t("zoomIn")}
          className="btn btn-circle bg-base-100 shadow-md"
        >
          <Plus className="size-5" aria-hidden />
        </button>
      </div>

      <div>
        <span className="rounded-field bg-base-100/90 px-2 py-1 text-sm font-medium shadow">
          {t("zoomOut")}
        </span>
        <button
          type="button"
          onClick={(e) => {
            map.zoomOut();
            e.currentTarget.focus(); // keep the dial open for repeated taps
          }}
          aria-label={t("zoomOut")}
          className="btn btn-circle bg-base-100 shadow-md"
        >
          <Minus className="size-5" aria-hidden />
        </button>
      </div>

      <div>
        <span className="rounded-field bg-base-100/90 px-2 py-1 text-sm font-medium shadow">
          {t("locateMe")}
        </span>
        <button
          type="button"
          onClick={locate}
          aria-label={t("locateMe")}
          className="btn btn-circle bg-base-100 shadow-md"
        >
          <LocateFixed className="size-5" aria-hidden />
        </button>
      </div>

      <div>
        <span className="rounded-field bg-base-100/90 px-2 py-1 text-sm font-medium shadow">
          {tf("title")}
        </span>
        <span className="indicator">
          {activeCount > 0 && (
            <span
              className="indicator-item badge badge-accent badge-sm font-semibold"
              aria-hidden
            >
              {activeCount}
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={activeCount > 0 ? tf("openWithCount", { count: activeCount }) : tf("open")}
            className="btn btn-circle bg-base-100 shadow-md"
          >
            <SlidersHorizontal className="size-5" aria-hidden />
          </button>
        </span>
      </div>
    </div>
  );
}
