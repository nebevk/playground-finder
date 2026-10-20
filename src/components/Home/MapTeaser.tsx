"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { MapPlayground } from "@/lib/playground-types";
import { HomeMapClient } from "./HomeMapClient";

// Phones and md: a picture of the map with a caption bar, all one link to /map. The map is inert
// (no focusable pins or credits inside the link, nothing for screen readers) and ignores the
// pointer, so a swipe over it scrolls the page. `isolate` keeps Leaflet's z-index 400+ panes
// from painting over the bottom nav. Hidden from lg, where the full-height panel takes over.
export function MapTeaser({
  points,
  user,
  nearestIds,
  mount,
}: {
  points: MapPlayground[];
  user: { lat: number; lng: number } | null;
  nearestIds: readonly string[];
  /** Mount Leaflet only where this teaser is the visible map (below lg). */
  mount: boolean;
}) {
  const t = useTranslations("home");
  return (
    <Link
      href="/map"
      className="group block overflow-hidden rounded-box border border-base-300 bg-base-100 transition-colors hover:border-base-content/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
    >
      <div
        inert
        data-located={user ? "" : undefined}
        className="home-map pointer-events-none relative isolate h-44 bg-map-land md:h-64"
      >
        {mount && <HomeMapClient variant="teaser" points={points} user={user} nearestIds={nearestIds} />}
      </div>
      <div className="flex min-h-12 items-center gap-2 border-t border-base-300 px-4 py-3">
        <span className="font-semibold">{t("explore")}</span>
        <span className="ml-auto text-sm text-base-content/70">{t("mapCount", { count: points.length })}</span>
        <ChevronRight
          className="size-4 shrink-0 text-base-content/60 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </Link>
  );
}
