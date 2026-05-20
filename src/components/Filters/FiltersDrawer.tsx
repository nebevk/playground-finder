"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  PLAYGROUND_FEATURE_KEYS,
  SURFACE_TYPES,
  useFilters,
} from "./FiltersContext";

export function FiltersDrawer({ visibleCount }: { visibleCount: number }) {
  const t = useTranslations("filters");
  const { state, open, setOpen, toggleFeature, toggleSurface, clearAll, activeCount } =
    useFilters();

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[1300] bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={`fixed top-0 right-0 z-[1400] flex h-dvh w-full max-w-sm flex-col border-l border-base-300 bg-base-100 shadow-xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-base-300 px-5 py-4">
          <h2 className="text-lg font-bold">{t("title")}</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("title")}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">{t("features")}</legend>
            <ul className="flex flex-col gap-2">
              {PLAYGROUND_FEATURE_KEYS.map((key) => (
                <li key={key}>
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={state.features.has(key)}
                      onChange={() => toggleFeature(key)}
                    />
                    <span>{t(`feature.${key}`)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="mb-2 text-sm font-semibold">{t("surface")}</legend>
            <div className="flex flex-wrap gap-2">
              {SURFACE_TYPES.map((s) => {
                const active = state.surfaces.has(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSurface(s)}
                    className={`btn btn-sm ${active ? "btn-primary" : "btn-outline"}`}
                  >
                    {t(`surfaceOption.${s}`)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-base-300 px-5 py-4">
          <button
            type="button"
            onClick={clearAll}
            disabled={activeCount === 0}
            className="btn btn-ghost btn-sm"
          >
            {t("clear")}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn btn-primary btn-sm"
          >
            {t("apply", { count: visibleCount })}
          </button>
        </footer>
      </aside>
    </>
  );
}
