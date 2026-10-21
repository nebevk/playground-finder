"use client";

import type { CSSProperties } from "react";
import { useMap } from "react-leaflet";
import { useTranslations } from "next-intl";
import { LocateFixed, Minus, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useFilters } from "@/components/Filters/FiltersContext";
import { useUserLocation } from "@/components/Location/UserLocationContext";

// Map controls, always visible and one tap each (design critique, BL-51/BL-52):
// - bottom-left: "Filtri" with a count of active filters, so filtered-out pins don't just vanish;
// - bottom-right: zoom (the alternative to pinching, WCAG 2.5.1) and a 48 px locate button,
//   the parent's core action, closest to the thumb.
// Rendered inside <MapContainer> so `useMap()` works. `lift` is how far the open playground
// sheet reaches up from the map's bottom edge (0 when closed). On phones the sheet spans the
// width, so both groups rise above it; on md+ it's a card in the bottom-right corner, so only
// the right group does. The right column also reaches to the map's top with "safe" end
// alignment, so on a short map (a landscape phone) it stops at the top instead of leaving it.
export function MapControls({ lift }: { lift: number }) {
  const map = useMap();
  const t = useTranslations("map");
  const tf = useTranslations("filters");
  const ts = useTranslations("search");
  const { setOpen, activeCount } = useFilters();
  const { locate, locating } = useUserLocation();

  async function onLocate() {
    const pos = await locate();
    if (pos) map.setView([pos.lat, pos.lng], Math.max(map.getZoom(), 15));
  }

  const liftVar = { "--lift": `${lift}px` } as CSSProperties;

  return (
    <>
      <div
        className="absolute bottom-[calc(var(--lift)+1rem)] left-4 z-1000 flex gap-2 transition-[bottom] duration-200 md:bottom-4"
        style={liftVar}
      >
        <Link
          href="/search"
          aria-label={ts("open")}
          // Important: Leaflet’s own stylesheet (unlayered, so it beats utilities) colours every link
          // inside the map blue.
          className="btn btn-circle border-base-300 bg-base-100 text-base-content! shadow-sm"
        >
          <Search className="size-5" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={activeCount > 0 ? tf("openWithCount", { count: activeCount }) : tf("open")}
          className="btn gap-2 rounded-full border-base-300 bg-base-100 shadow-sm"
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

      <div
        className="pointer-events-none absolute top-4 right-4 bottom-[calc(var(--lift)+1rem)] z-1000 flex flex-col items-center justify-end-safe gap-2 transition-[bottom] duration-200"
        style={liftVar}
      >
        <div className="pointer-events-auto join join-vertical rounded-full border border-base-300 bg-base-100 shadow-sm">
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
          className="pointer-events-auto btn btn-circle btn-lg btn-primary shadow-sm"
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
