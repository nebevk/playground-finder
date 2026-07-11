"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, string> = {
  sl: "Slovenščina",
  en: "English",
};

export function LocaleSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("language")} className="join">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={pathname}
          locale={l}
          aria-current={l === locale ? "true" : undefined}
          aria-label={LOCALE_LABELS[l] ?? l}
          className={`btn join-item btn-xs uppercase ${
            l === locale ? "btn-primary" : "btn-ghost"
          }`}
        >
          {l}
        </Link>
      ))}
    </nav>
  );
}
