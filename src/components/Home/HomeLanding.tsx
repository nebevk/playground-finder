"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Wordmark } from "@/components/Brand";
import { EmptyState } from "@/components/EmptyState";
import { useUserLocation } from "@/components/Location/UserLocationContext";
import { nearestPlaygrounds, pickHomeLists } from "@/lib/home-lists";
import { unpackSnapshot, type PackedPlayground } from "@/lib/map-snapshot";
import type { MapPlayground } from "@/lib/playground-types";
import { useMediaQuery } from "@/lib/useMediaQuery";
import type { HomeMapActive } from "./HomeMap";
import { HomeMapClient } from "./HomeMapClient";
import { MapTeaser } from "./MapTeaser";
import { LocateCta, NearbySection } from "./NearbySection";
import { PlaygroundRow } from "./PlaygroundRow";

// Home. From lg (1024 px) a map-search split view: a list column that scrolls on its own beside a
// full-height map, row and pin answering each other. Below lg the same column is the whole page,
// with the map as a teaser between "near me" and the lists. Only the visible map is mounted.
export function HomeLanding({
  packed,
  popularIds,
  latestIds,
}: {
  /** The map snapshot, as the server sends it (ADR-0001). */
  packed: PackedPlayground[];
  /** Most viewed first; more than a list shows, to refill rows taken by "V bližini". */
  popularIds: string[];
  /** Newest first, same idea. */
  latestIds: string[];
}) {
  const points = useMemo(() => unpackSnapshot(packed), [packed]);
  const t = useTranslations("home");
  const tMap = useTranslations("map");
  const tSearch = useTranslations("search");
  const router = useRouter();
  const { position, locating, locate, distanceTo } = useUserLocation();
  const isLg = useMediaQuery("(min-width: 1024px)");
  const [active, setActive] = useState<HomeMapActive>(null);

  const nearest = useMemo(() => (position ? nearestPlaygrounds(points, position) : []), [points, position]);
  const nearestIds = useMemo(() => nearest.map(({ p }) => p.id), [nearest]);
  const { popular, latest } = useMemo(
    () => pickHomeLists({ points, popularIds, latestIds, nearestIds }),
    [points, popularIds, latestIds, nearestIds],
  );
  // A stable identity (a new one only with a new position), so hovering never re-frames the map.
  const user = useMemo(() => (position ? { lat: position.lat, lng: position.lng } : null), [position]);

  const onActivate = useCallback(
    (id: string | null, from: "pointer" | "focus") => setActive(id ? { id, from } : null),
    [],
  );
  const onHover = useCallback((id: string | null) => setActive(id ? { id, from: "map" } : null), []);
  const onOpen = useCallback((id: string) => router.push(`/playground/${id}`), [router]);
  const rowActivate = isLg ? onActivate : undefined;

  // The button gives way to "V bližini", so focus moves to its heading, but only after an
  // explicit tap: a position remembered from /map shows the section without moving focus.
  const nearbyHeading = useRef<HTMLHeadingElement>(null);
  const focusNearby = useRef(false);
  useEffect(() => {
    if (position && focusNearby.current) {
      focusNearby.current = false;
      nearbyHeading.current?.focus();
    }
  }, [position]);

  const onLocate = async () => {
    if (locating) return;
    focusNearby.current = true;
    if (!(await locate())) focusNearby.current = false;
  };
  const onRefresh = () => {
    if (!locating) void locate();
  };

  const list = (id: string, title: string, items: MapPlayground[]) =>
    items.length > 0 && (
      <section aria-labelledby={id}>
        <h2 id={id} className="mb-1 text-lg font-bold">
          {title}
        </h2>
        {/* -mx-2 with the rows' px-2: row text and DaisyUI's inset dividers line up with the
            headings, and only the hover tint bleeds out. */}
        <ul className="list -mx-2">
          {items.map((p) => (
            <PlaygroundRow
              key={p.id}
              p={p}
              distance={distanceTo(p.lat, p.lng)}
              active={active?.id === p.id}
              onActivate={rowActivate}
            />
          ))}
        </ul>
      </section>
    );

  return (
    <div className="w-full md:flex md:h-dvh">
      {/* The list column: the whole page on phones (the document scrolls); its own scroller from
          md, so the side nav stays put. */}
      <div className="min-w-0 md:flex-1 md:overflow-y-auto md:[scrollbar-gutter:stable] lg:w-90 lg:flex-none lg:border-r lg:border-base-300 xl:w-105 2xl:w-115">
        <div className="mx-auto flex max-w-md flex-col gap-8 px-4 pt-8 pb-10 md:max-w-xl md:px-8 md:pt-12 lg:max-w-none lg:px-6 lg:pt-10 xl:px-8">
          {/* The page's only h1. On phones the wordmark is the visual title (the brand is in the
              side nav from md), so the h1 is there for screen readers only. */}
          <header className="flex flex-col items-center gap-3 text-center md:items-start md:gap-2 md:text-left">
            <Wordmark className="text-4xl sm:text-5xl md:hidden" />
            <h1 className="sr-only md:not-sr-only md:text-3xl md:leading-tight md:font-extrabold md:tracking-tight md:text-balance 2xl:text-4xl">
              {t("title")}
            </h1>
            <p className="text-base text-base-content/80 md:text-base-content/70">{t("intro")}</p>
            <Link href="/search" className="input mt-2 w-full text-base-content/60 md:mt-1 md:max-w-sm">
              <Search className="size-5 opacity-60" aria-hidden />
              {tSearch("open")}
            </Link>
          </header>

          {points.length === 0 ? (
            <EmptyState
              variant="playgrounds"
              title={t("noLatest")}
              action={
                <Link href="/add" className="btn btn-primary">
                  {tMap("emptyNoneAction")}
                </Link>
              }
            />
          ) : position && nearest.length > 0 ? (
            <NearbySection
              nearest={nearest}
              position={position}
              locating={locating}
              onRefresh={onRefresh}
              headingRef={nearbyHeading}
              activeId={active?.id ?? null}
              onActivate={rowActivate}
            />
          ) : (
            <LocateCta locating={locating} onLocate={() => void onLocate()} />
          )}

          {points.length > 0 && (
            <MapTeaser points={points} user={user} nearestIds={nearestIds} mount={isLg === false} />
          )}

          {list("home-popular", t("popular"), popular)}
          {list("home-latest", t("latest"), latest)}

          {points.length > 0 && (
            <p className="-mt-3 flex flex-wrap items-center gap-x-1.5 text-sm text-base-content/70">
              {t("missingPrompt")}
              <Link href="/add" className="link link-primary inline-flex min-h-11 items-center font-semibold">
                {t("addIt")}
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* lg+: the map fills the rest of the screen and stays put while the list scrolls. The link
          comes first in the DOM, so Tab reaches it before the zoom buttons and the OSM credit. */}
      <div className="relative isolate hidden min-w-0 flex-1 bg-map-land lg:block">
        <Link
          href="/map"
          className="btn absolute top-4 right-4 z-1000 gap-2 border-base-300 bg-base-100 shadow-sm hover:bg-base-200"
        >
          {t("explore")}
          {points.length > 0 && (
            <>
              <span aria-hidden className="text-base-content/50">
                ·
              </span>
              <span className="font-normal text-base-content/70">{t("mapCount", { count: points.length })}</span>
            </>
          )}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
        <div data-located={user ? "" : undefined} className="home-map absolute inset-0">
          {isLg === true && (
            <HomeMapClient
              variant="panel"
              points={points}
              user={user}
              nearestIds={nearestIds}
              active={active}
              onHover={onHover}
              onOpen={onOpen}
            />
          )}
        </div>
      </div>
    </div>
  );
}
