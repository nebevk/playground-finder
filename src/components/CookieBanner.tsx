"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useLocalStorageFlag } from "@/lib/useLocalStorageFlag";

const STORAGE_KEY = "pf-cookies-ack-v1";

// At the top on phones, so it never covers the map's bottom controls or the add flow's
// action bar (BL-42); bottom-right on desktop.
export function CookieBanner() {
  const t = useTranslations("cookies");
  const [acknowledged, accept] = useLocalStorageFlag(STORAGE_KEY);

  if (acknowledged) return null;

  return (
    <div
      role="region"
      aria-label={t("message")}
      className="fixed inset-x-2 top-[calc(env(safe-area-inset-top)+0.5rem)] z-1500 mx-auto max-w-md rounded-box border border-base-300 bg-base-100 p-4 shadow-lg md:top-auto md:right-4 md:bottom-4 md:left-auto md:mx-0 md:max-w-sm"
    >
      <p className="text-sm text-base-content/80">{t("message")}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <Link href="/privacy" className="link link-primary inline-flex min-h-11 items-center text-sm">
          {t("learnMore")}
        </Link>
        <button type="button" onClick={accept} className="btn btn-primary">
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
