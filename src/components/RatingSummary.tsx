"use client";

import { Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatRating } from "@/lib/format";

// Aggregate rating, with the decimal separator of the visitor's language ("4,6" in Slovenian):
// - default: ★ 4,6 · 12 mnenj, or "Še ni ocen" when there are none;
// - compact (list rows): ★ 4,6 (12), read out as "Ocena 4,6, 12 mnenj".
// A client island so it can be dropped into both server pages and client components.
export function RatingSummary({
  avg,
  count,
  size = "sm",
  variant = "default",
}: {
  avg: number | null;
  count: number;
  size?: "sm" | "lg";
  variant?: "default" | "compact";
}) {
  const t = useTranslations("detail");
  const locale = useLocale();

  if (count === 0 || avg == null) {
    return <span className="text-sm text-base-content/60">{t("noRatingsYet")}</span>;
  }

  if (variant === "compact") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1">
        <Star className="size-3.5 fill-star stroke-star-edge" aria-hidden />
        <span className="sr-only">{t("rating")} </span>
        <span className="font-semibold text-base-content">{formatRating(avg, locale)}</span>
        <span aria-hidden>({count})</span>
        <span className="sr-only">, {t("reviewsCount", { count })}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1">
        <Star
          className={`${size === "lg" ? "size-5" : "size-4"} fill-star stroke-star-edge`}
          aria-hidden
        />
        <span className={`font-bold ${size === "lg" ? "text-base" : "text-sm"}`}>
          {formatRating(avg, locale)}
        </span>
      </span>
      <span className="text-sm text-base-content/60">{t("reviewsCount", { count })}</span>
    </span>
  );
}
