"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { FiltersProvider, useFilters } from "@/components/Filters/FiltersContext";
import { FiltersButton } from "@/components/Filters/FiltersButton";
import { FiltersDrawer } from "@/components/Filters/FiltersDrawer";
import type { MapPlayground } from "@/lib/playgrounds";

const PlaygroundMap = dynamic(
  () => import("./PlaygroundMap").then((m) => m.PlaygroundMap),
  {
    ssr: false,
    loading: () => <MapLoading />,
  },
);

function MapLoading() {
  const t = useTranslations("map");
  return (
    <div className="flex h-full w-full items-center justify-center bg-base-200">
      <span className="loading loading-spinner loading-lg text-primary" aria-label={t("loading")} />
    </div>
  );
}

function MapWithFilters({ playgrounds }: { playgrounds: MapPlayground[] }) {
  const { matches } = useFilters();
  const visible = useMemo(() => playgrounds.filter(matches), [playgrounds, matches]);

  return (
    <div className="relative h-full w-full">
      <PlaygroundMap playgrounds={visible} />
      <FiltersButton />
      <FiltersDrawer visibleCount={visible.length} />
    </div>
  );
}

export function MapClient({ playgrounds }: { playgrounds: MapPlayground[] }) {
  return (
    <FiltersProvider>
      <MapWithFilters playgrounds={playgrounds} />
    </FiltersProvider>
  );
}
