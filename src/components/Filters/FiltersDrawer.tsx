"use client";

import { useEffect, useId } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { FEATURE_ICONS, FeatureToggle } from "@/components/FeatureChip";
import {
  PLAYGROUND_FEATURE_KEYS,
  SURFACE_TYPES,
  useFilters,
} from "./FiltersContext";

export function FiltersDrawer({ visibleCount }: { visibleCount: number }) {
  const t = useTranslations("filters");
  const tCommon = useTranslations("common");
  const titleId = useId();
  const { state, open, setOpen, toggleFeature, toggleSurface, clearAll, activeCount } =
    useFilters();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-1300 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={!open}
        inert={!open}
        // Invisible once closed, so its shadow doesn't bleed in from the screen edge.
        className={`fixed top-0 right-0 z-1400 flex h-dvh w-full max-w-sm flex-col border-l border-base-300 bg-base-100 shadow-xl transition-[translate,visibility] duration-200 ${
          open ? "visible translate-x-0" : "invisible translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-base-300 px-5 py-3">
          <h2 id={titleId} className="text-lg font-bold">
            {t("title")}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={tCommon("close")}
            className="btn btn-ghost btn-circle"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <fieldset>
            <legend className="mb-3 text-sm font-semibold">{t("features")}</legend>
            <div className="flex flex-wrap gap-2">
              {PLAYGROUND_FEATURE_KEYS.map((key) => (
                <FeatureToggle
                  key={key}
                  icon={FEATURE_ICONS[key]}
                  label={t(`feature.${key}`)}
                  checked={state.features.has(key)}
                  onChange={() => toggleFeature(key)}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="mb-3 text-sm font-semibold">{t("surface")}</legend>
            <div className="flex flex-wrap gap-2">
              {SURFACE_TYPES.map((s) => (
                <FeatureToggle
                  key={s}
                  label={t(`surfaceOption.${s}`)}
                  checked={state.surfaces.has(s)}
                  onChange={() => toggleSurface(s)}
                />
              ))}
            </div>
          </fieldset>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-base-300 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button type="button" onClick={clearAll} disabled={activeCount === 0} className="btn btn-ghost">
            {t("clear")}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn btn-primary flex-1">
            {t("apply", { results: t("results", { count: visibleCount }) })}
          </button>
        </footer>
      </aside>
    </>
  );
}
