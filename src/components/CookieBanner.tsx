"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useLocalStorageFlag } from "@/lib/useLocalStorageFlag";

const STORAGE_KEY = "pf-cookies-ack-v1";

export function CookieBanner() {
  const t = useTranslations("cookies");
  const [acknowledged, accept] = useLocalStorageFlag(STORAGE_KEY);

  if (acknowledged) return null;

  return (
    <div
      role="region"
      aria-label={t("message")}
      className="fixed inset-x-2 bottom-24 z-[1500] mx-auto max-w-md rounded-box border border-base-300 bg-base-100 p-4 shadow-lg md:bottom-4 md:right-4 md:left-auto md:mx-0 md:max-w-sm"
    >
      <p className="text-sm text-base-content/80">{t("message")}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <Link href="/privacy" className="link link-hover text-sm">
          {t("learnMore")}
        </Link>
        <button type="button" onClick={accept} className="btn btn-primary btn-sm">
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
