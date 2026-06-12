"use client";

import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFilters } from "./FiltersContext";

export function FiltersButton() {
  const t = useTranslations("filters");
  const { setOpen, activeCount } = useFilters();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={t("open")}
      className="indicator absolute top-4 right-4 z-[1000]"
    >
      {activeCount > 0 && (
        <span className="indicator-item badge badge-accent badge-sm font-semibold">
          {activeCount}
        </span>
      )}
      <span className="btn btn-circle btn-md bg-base-100 shadow-lg">
        <SlidersHorizontal className="size-5" aria-hidden />
      </span>
    </button>
  );
}
