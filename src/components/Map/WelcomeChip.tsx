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
      className="pointer-events-auto absolute top-4 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-full border border-base-300 bg-base-100 px-4 py-2 text-sm shadow-lg animate-in fade-in slide-in-from-top-2 duration-500"
    >
      <span aria-hidden className="text-base">👋</span>
      <span>{t("welcome")}</span>
      <button
        type="button"
        onClick={markSeen}
        aria-label={t("dismiss")}
        className="btn btn-ghost btn-xs btn-circle -mr-2"
      >
        <X className="size-3" aria-hidden />
      </button>
    </div>
  );
}
