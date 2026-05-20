"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { MapPlayground } from "@/lib/playgrounds";

export function PlaygroundSheet({
  playground,
  onClose,
}: {
  playground: MapPlayground | null;
  onClose: () => void;
}) {
  const t = useTranslations("map");
  const open = playground !== null;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[1100] bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={`fixed inset-x-0 bottom-0 z-[1200] mx-auto max-w-md rounded-t-2xl border-t border-base-300 bg-base-100 p-5 shadow-xl transition-transform md:right-4 md:bottom-4 md:left-auto md:max-w-sm md:rounded-2xl md:border ${
          open ? "translate-y-0" : "translate-y-full md:translate-y-[120%]"
        }`}
      >
        {playground && (
          <>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold">{playground.name}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("close")}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            {playground.description && (
              <p className="mt-2 text-sm text-base-content/70">{playground.description}</p>
            )}
            <Link
              href={`/playground/${playground.id}`}
              className="btn btn-primary btn-sm mt-4 w-full"
            >
              {t("seeDetails")}
            </Link>
          </>
        )}
      </div>
    </>
  );
}
