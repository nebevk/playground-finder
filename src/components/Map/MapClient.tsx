"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { MapPinned, SlidersHorizontal } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { FiltersProvider, useFilters } from "@/components/Filters/FiltersContext";
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
  const { matches, activeCount, clearAll } = useFilters();
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

  const empty = visible.length === 0;
  const filtered = activeCount > 0;

  return (
    <div className="relative h-full w-full">
      <PlaygroundMap playgrounds={visible} focusId={addedId} />
      <FiltersDrawer visibleCount={visible.length} />

      {empty && (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="pointer-events-auto flex max-w-xs flex-col items-center gap-3 rounded-box border border-base-300 bg-base-100/95 p-6 text-center shadow-xl backdrop-blur">
            <span className="text-primary">
              {filtered ? (
                <SlidersHorizontal className="size-8" aria-hidden />
              ) : (
                <MapPinned className="size-8" aria-hidden />
              )}
            </span>
            <p className="text-base font-bold">
              {t(filtered ? "emptyFilteredTitle" : "emptyNoneTitle")}
            </p>
            <p className="text-sm text-base-content/60">
              {t(filtered ? "emptyFiltered" : "emptyNone")}
            </p>
            {filtered ? (
              <button type="button" onClick={clearAll} className="btn btn-primary btn-sm">
                {t("emptyFilteredAction")}
              </button>
            ) : (
              <Link href="/add" className="btn btn-primary btn-sm">
                {t("emptyNoneAction")}
              </Link>
            )}
          </div>
        </div>
      )}
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
