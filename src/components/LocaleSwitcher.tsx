"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, string> = {
  sl: "Slovenščina",
  en: "English",
};

// Segmented control (DaisyUI tabs-box): one pill per language, 44 px tall.
export function LocaleSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("language")} className="tabs tabs-box">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={pathname}
          locale={l}
          aria-current={l === locale ? "true" : undefined}
          aria-label={LOCALE_LABELS[l] ?? l}
          className={`tab min-h-11 min-w-11 font-semibold uppercase ${l === locale ? "tab-active" : ""}`}
        >
          {l}
        </Link>
      ))}
    </nav>
  );
}
