"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { FiltersProvider, useFilters } from "@/components/Filters/FiltersContext";
import { FiltersButton } from "@/components/Filters/FiltersButton";
import { FiltersDrawer } from "@/components/Filters/FiltersDrawer";
import { LoadingSwing } from "@/components/LoadingSwing";
import { useToast } from "@/components/Toast/ToastProvider";
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
  return <LoadingSwing label={t("loading")} />;
}

function MapWithFilters({
  playgrounds,
  addedId,
}: {
  playgrounds: MapPlayground[];
  addedId: string | null;
}) {
  const { matches } = useFilters();
  const visible = useMemo(() => playgrounds.filter(matches), [playgrounds, matches]);

  const t = useTranslations("map");
  const { showToast } = useToast();
  const celebrated = useRef(false);

  // After a successful "add playground" redirect (?added=<id>), celebrate once,
  // then strip the param so a refresh doesn't re-fire the toast.
  useEffect(() => {
    if (!addedId || celebrated.current) return;
    celebrated.current = true;
    showToast(t("addedToast"), "success", 5000);
    window.history.replaceState(null, "", window.location.pathname);
  }, [addedId, showToast, t]);

  return (
    <div className="relative h-full w-full">
      <PlaygroundMap playgrounds={visible} focusId={addedId} />
      <FiltersButton />
      <FiltersDrawer visibleCount={visible.length} />
    </div>
  );
}

export function MapClient({
  playgrounds,
  addedId = null,
}: {
  playgrounds: MapPlayground[];
  addedId?: string | null;
}) {
  return (
    <FiltersProvider>
      <MapWithFilters playgrounds={playgrounds} addedId={addedId} />
    </FiltersProvider>
  );
}
