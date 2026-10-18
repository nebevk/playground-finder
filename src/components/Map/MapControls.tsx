"use client";

import { useMap } from "react-leaflet";
import { useTranslations } from "next-intl";
import { LocateFixed, Minus, Plus, SlidersHorizontal } from "lucide-react";
import { useFilters } from "@/components/Filters/FiltersContext";
import { useUserLocation } from "@/components/Location/UserLocationContext";

// Map controls, always visible and one tap each (design critique, BL-51/BL-52):
// - bottom-left: "Filtri" with a count of active filters, so filtered-out pins don't just vanish;
// - bottom-right: zoom (the alternative to pinching, WCAG 2.5.1) and a 48 px locate button,
//   the parent's core action, closest to the thumb.
// Rendered inside <MapContainer> so `useMap()` works. `bottom` lifts both groups above the
// playground sheet while it's open.
export function MapControls({ bottom }: { bottom: number }) {
  const map = useMap();
  const t = useTranslations("map");
  const tf = useTranslations("filters");
  const { setOpen, activeCount } = useFilters();
  const { locate, locating } = useUserLocation();

  async function onLocate() {
    const pos = await locate();
    if (pos) map.setView([pos.lat, pos.lng], Math.max(map.getZoom(), 15));
  }

  const style = { bottom: `${bottom}px`, transition: "bottom 200ms ease" };

  return (
    <>
      <div className="absolute left-4 z-1000" style={style}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={activeCount > 0 ? tf("openWithCount", { count: activeCount }) : tf("open")}
          className="btn gap-2 rounded-full border-base-300 bg-base-100 shadow-md"
        >
          <SlidersHorizontal className="size-5" aria-hidden />
          {tf("open")}
          {activeCount > 0 && (
            <span className="badge badge-primary badge-sm font-semibold" aria-hidden>
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <div className="absolute right-4 z-1000 flex flex-col items-center gap-2" style={style}>
        <div className="join join-vertical rounded-full bg-base-100 shadow-md">
          <button
            type="button"
            onClick={() => map.zoomIn()}
            aria-label={t("zoomIn")}
            className="btn btn-ghost join-item btn-square rounded-t-full"
          >
            <Plus className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => map.zoomOut()}
            aria-label={t("zoomOut")}
            className="btn btn-ghost join-item btn-square rounded-b-full"
          >
            <Minus className="size-5" aria-hidden />
          </button>
        </div>
        <button
          type="button"
          onClick={onLocate}
          disabled={locating}
          aria-label={locating ? t("locating") : t("locateMe")}
          className="btn btn-circle btn-lg btn-primary shadow-lg"
        >
          {locating ? (
            <span className="loading loading-spinner loading-sm" aria-hidden />
          ) : (
            <LocateFixed className="size-6" aria-hidden />
          )}
        </button>
      </div>
    </>
  );
}
