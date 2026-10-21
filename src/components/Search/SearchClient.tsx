"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { PlaygroundRow } from "@/components/Home/PlaygroundRow";
import { Loader } from "@/components/Loader";
import { useUserLocation } from "@/components/Location/UserLocationContext";
import { searchPlaceAction, type PlaceSearch } from "@/app/[locale]/search/actions";
import { unpackSnapshot, type PackedPlayground } from "@/lib/map-snapshot";
import { nearPlace, normalizeForSearch, searchByName } from "@/lib/search";

// Search (FR-MAP-10). Names (and descriptions) are matched as you type, without accents, over the
// map snapshot; submitting also looks the words up as a place and lists the playgrounds around it.
export function SearchClient({ packed }: { packed: PackedPlayground[] }) {
  const t = useTranslations("search");
  const points = useMemo(() => unpackSnapshot(packed), [packed]);
  const { distanceTo } = useUserLocation();
  const [query, setQuery] = useState("");
  // The place answer for the query it was asked for, so editing the text clears a stale one.
  const [place, setPlace] = useState<{ query: string; result: PlaceSearch } | null>(null);
  const [searching, startSearch] = useTransition();

  const typed = normalizeForSearch(query);
  const byName = useMemo(() => (typed.length >= 2 ? searchByName(points, typed) : []), [points, typed]);
  const placeResult = place?.query === typed ? place.result : null;
  const near = placeResult && "place" in placeResult && placeResult.place ? nearPlace(points, placeResult.place) : [];

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-5 p-4 pt-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (typed.length < 2) return;
          startSearch(async () => setPlace({ query: typed, result: await searchPlaceAction(query) }));
        }}
        className="flex gap-2"
      >
        <label className="input w-full">
          <Search className="size-5 opacity-60" aria-hidden />
          <input
            type="search"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            enterKeyHint="search"
            autoComplete="off"
            autoFocus
          />
        </label>
        <button type="submit" disabled={searching || typed.length < 2} className="btn btn-primary shrink-0">
          {t("submit")}
        </button>
      </form>

      {typed.length < 2 && <p className="text-sm text-base-content/70">{t("hint")}</p>}

      {byName.length > 0 && (
        <section aria-labelledby="by-name">
          <h2 id="by-name" className="mb-1 text-lg font-bold">
            {t("byName")}
          </h2>
          <ul className="list -mx-2">
            {byName.map((p) => (
              <PlaygroundRow key={p.id} p={p} distance={distanceTo(p.lat, p.lng)} />
            ))}
          </ul>
        </section>
      )}
      {typed.length >= 2 && byName.length === 0 && !placeResult && !searching && (
        <p className="text-sm text-base-content/70">{t("noNameMatches", { query: query.trim() })}</p>
      )}

      {searching && (
        <div role="status" className="flex items-center gap-3 text-sm text-base-content/70">
          <Loader variant="pin" className="h-12 w-auto" />
          {t("searchingPlace")}
        </div>
      )}
      {!searching && placeResult && (
        <section aria-labelledby="near-place">
          {"error" in placeResult ? (
            <p role="alert" className="text-sm text-error">
              {placeResult.error === "rate_limited" ? t("rateLimited") : t("failed")}
            </p>
          ) : !placeResult.place ? (
            <p className="text-sm text-base-content/70">{t("placeNotFound", { query: query.trim() })}</p>
          ) : (
            <>
              <h2 id="near-place" className="mb-1 text-lg font-bold">
                {t("nearPlace", { place: placeResult.place.name })}
              </h2>
              {near.length === 0 ? (
                <p className="text-sm text-base-content/70">{t("nothingNear", { place: placeResult.place.name })}</p>
              ) : (
                <ul className="list -mx-2">
                  {near.map(({ p, distance }) => (
                    <PlaygroundRow key={p.id} p={p} distance={distance} />
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}
    </section>
  );
}
