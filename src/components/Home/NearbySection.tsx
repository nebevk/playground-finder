"use client";

import type { Ref } from "react";
import { LocateFixed, RotateCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { UserPosition } from "@/components/Location/UserLocationContext";
import { formatDistance } from "@/lib/geo";
import type { MapPlayground } from "@/lib/playground-types";
import { PlaygroundRow } from "./PlaygroundRow";

/** Above this accuracy (metres) the distances are flagged as rough. */
const ROUGH_ACCURACY_M = 250;
/** Beyond this distance to the nearest playground, ask the visitor to add one closer. */
const FAR_AWAY_M = 10_000;

// The parent's core question, "which playground is closest?", as one tap (BL-53).
// aria-disabled, not disabled, while locating: a disabled button drops keyboard focus to <body>
// when a slow permission prompt ends in "Block".
export function LocateCta({ locating, onLocate }: { locating: boolean; onLocate: () => void }) {
  const t = useTranslations("home");
  const tMap = useTranslations("map");
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onLocate}
        aria-disabled={locating || undefined}
        aria-busy={locating || undefined}
        className="btn btn-primary btn-lg btn-block gap-2"
      >
        {locating ? (
          <span className="loading loading-spinner loading-sm" aria-hidden />
        ) : (
          <LocateFixed className="size-5" aria-hidden />
        )}
        {locating ? tMap("locating") : t("findNearby")}
      </button>
      <p className="text-center text-sm text-base-content/70 md:text-left">{t("locationPrivacy")}</p>
    </div>
  );
}

// "V bližini": the nearest playgrounds, numbered like their pins, with straight-line distances.
// Distances are computed in the browser; the position is never stored or sent (GDPR-13).
export function NearbySection({
  nearest,
  position,
  locating,
  onRefresh,
  headingRef,
  activeId,
  onActivate,
}: {
  nearest: { p: MapPlayground; d: number }[];
  position: UserPosition;
  locating: boolean;
  onRefresh: () => void;
  headingRef: Ref<HTMLHeadingElement>;
  activeId: string | null;
  onActivate?: (id: string | null, from: "pointer" | "focus") => void;
}) {
  const t = useTranslations("home");
  const locale = useLocale();
  return (
    <section aria-labelledby="home-nearby">
      <div className="flex items-center justify-between gap-3">
        <h2 id="home-nearby" ref={headingRef} tabIndex={-1} className="text-lg font-bold outline-none">
          {t("nearby")}
        </h2>
        {/* Never disabled or unmounted, so it keeps focus while the rows update in place. */}
        <button
          type="button"
          onClick={onRefresh}
          aria-label={t("refreshLabel")}
          aria-disabled={locating || undefined}
          aria-busy={locating || undefined}
          className="btn btn-ghost -me-3 gap-2"
        >
          {locating ? (
            <span className="loading loading-spinner loading-xs" aria-hidden />
          ) : (
            <RotateCw className="size-4" aria-hidden />
          )}
          {t("refresh")}
        </button>
      </div>
      <p className="text-sm text-base-content/70">
        {position.accuracy > ROUGH_ACCURACY_M
          ? t("nearbyApprox", { accuracy: formatDistance(position.accuracy, locale) })
          : t("nearbyFrom")}
      </p>
      <ol className="list -mx-2 mt-1">
        {nearest.map(({ p, d }, i) => (
          <PlaygroundRow
            key={p.id}
            p={p}
            distance={d}
            rank={i + 1}
            active={activeId === p.id}
            onActivate={onActivate}
          />
        ))}
      </ol>
      {nearest[0] && nearest[0].d > FAR_AWAY_M && (
        <p className="mt-2 text-sm text-base-content/80">
          {t("farAway", { distance: formatDistance(nearest[0].d, locale) })}{" "}
          <Link href="/add" className="link link-primary inline-flex min-h-11 items-center font-semibold">
            {t("addIt")}
          </Link>
        </p>
      )}
    </section>
  );
}
