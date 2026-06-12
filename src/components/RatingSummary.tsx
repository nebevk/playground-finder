"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

// Compact aggregate rating: ★ 4.3 · 12 reviews. Renders "No ratings yet" when empty.
// A client island so it can be dropped into both server pages and client components.
export function RatingSummary({
  avg,
  count,
  size = "sm",
}: {
  avg: number | null;
  count: number;
  size?: "sm" | "lg";
}) {
  const t = useTranslations("detail");

  if (count === 0 || avg == null) {
    return <span className="text-sm text-base-content/50">{t("noRatingsYet")}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1">
        <Star
          className={`${size === "lg" ? "size-5" : "size-4"} fill-warning stroke-warning`}
          aria-hidden
        />
        <span className={`font-bold ${size === "lg" ? "text-base" : "text-sm"}`}>
          {avg.toFixed(1)}
        </span>
      </span>
      <span className="text-sm text-base-content/50">{t("reviewsCount", { count })}</span>
    </span>
  );
}
