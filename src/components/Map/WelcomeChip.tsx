"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useLocalStorageFlag } from "@/lib/useLocalStorageFlag";

const STORAGE_KEY = "kje-so-igrala-map-welcome-v1";

export function WelcomeChip({ dismissed }: { dismissed: boolean }) {
  const t = useTranslations("map");
  const [seen, markSeen] = useLocalStorageFlag(STORAGE_KEY);

  // Interacting with the map (dismissed) counts as having seen the hint.
  useEffect(() => {
    if (dismissed) markSeen();
  }, [dismissed, markSeen]);

  if (seen) return null;

  return (
    <div
      role="status"
      // w-max: an absolutely positioned box at left-1/2 would otherwise shrink to half the map
      // and wrap to three lines on a phone.
      className="pointer-events-auto absolute top-5 left-1/2 z-[1000] flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-base-300 bg-base-100 px-4 py-2 text-sm shadow-lg"
    >
      <span aria-hidden className="text-base">👋</span>
      <span>{t("welcome")}</span>
      <button
        type="button"
        onClick={markSeen}
        aria-label={t("dismiss")}
        className="btn btn-ghost btn-circle -mr-3"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
