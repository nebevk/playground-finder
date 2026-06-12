"use client";

import { useTranslations } from "next-intl";
import { ThumbsUp } from "lucide-react";
import { toggleHelpfulAction } from "@/app/[locale]/playground/[id]/actions";

export function HelpfulButton({
  reviewId,
  playgroundId,
  count,
  marked,
  disabled,
  locale,
}: {
  reviewId: string;
  playgroundId: string;
  count: number;
  marked: boolean;
  disabled: boolean;
  locale: string;
}) {
  const t = useTranslations("detail");

  return (
    <form action={toggleHelpfulAction}>
      <input type="hidden" name="review_id" value={reviewId} />
      <input type="hidden" name="playground_id" value={playgroundId} />
      <input type="hidden" name="currently" value={String(marked)} />
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        disabled={disabled}
        aria-pressed={marked}
        className={`btn btn-sm min-h-10 gap-1 ${marked ? "btn-primary" : "btn-ghost"}`}
      >
        <ThumbsUp className="size-4" aria-hidden />
        <span>{t("helpful")}</span>
        {count > 0 && <span className="font-mono">{count}</span>}
      </button>
    </form>
  );
}
