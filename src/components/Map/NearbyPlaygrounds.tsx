"use client";

import { LocateFixed } from "lucide-react";
import { useTranslations } from "next-intl";
import { useUserLocation } from "@/components/Location/UserLocationContext";
import { haversineMeters } from "@/lib/geo";
import type { MapPlayground } from "@/lib/playgrounds";
import { PlaygroundCard } from "./PlaygroundCard";

const NEARBY_COUNT = 3;

// The parent's core question, "which playground is closest?", as one tap on Home (BL-53).
// Distances are computed here in the browser; the position is never stored (GDPR-13).
export function NearbyPlaygrounds({ playgrounds }: { playgrounds: MapPlayground[] }) {
  const t = useTranslations("home");
  const tMap = useTranslations("map");
  const { position, locating, locate } = useUserLocation();

  if (!position) {
    return (
      <button type="button" onClick={() => void locate()} disabled={locating} className="btn btn-primary btn-lg w-full gap-2">
        {locating ? (
          <span className="loading loading-spinner loading-sm" aria-hidden />
        ) : (
          <LocateFixed className="size-5" aria-hidden />
        )}
        {locating ? tMap("locating") : t("findNearby")}
      </button>
    );
  }

  const nearest = playgrounds
    .map((p) => ({ p, d: haversineMeters(position.lat, position.lng, p.lat, p.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, NEARBY_COUNT);

  return (
    <section aria-live="polite">
      <h2 className="mb-2 text-lg font-semibold">{t("nearby")}</h2>
      <ul className="flex flex-col gap-2">
        {nearest.map(({ p }, i) => (
          <li key={p.id}>
            <PlaygroundCard p={p} index={i} />
          </li>
        ))}
      </ul>
    </section>
  );
}
