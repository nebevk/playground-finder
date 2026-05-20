"use client";

import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { deleteReviewAction } from "@/app/[locale]/playground/[id]/actions";

export function DeleteReviewButton({
  reviewId,
  playgroundId,
  locale,
}: {
  reviewId: string;
  playgroundId: string;
  locale: string;
}) {
  const t = useTranslations("detail");

  return (
    <form action={deleteReviewAction}>
      <input type="hidden" name="review_id" value={reviewId} />
      <input type="hidden" name="playground_id" value={playgroundId} />
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        aria-label={t("deleteReview")}
        className="btn btn-ghost btn-xs btn-circle text-error"
      >
        <Trash2 className="size-3" aria-hidden />
      </button>
    </form>
  );
}
