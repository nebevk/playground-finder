"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { DeleteReviewButton } from "./DeleteReviewButton";
import { ReviewBody } from "./ReviewBody";
import { ReviewForm } from "./ReviewForm";

// The signed-in visitor's own review in the list: shown as everyone sees it, with Edit and Delete.
// Edit swaps it for the prefilled form in place (FR-COM-02). It renders the review itself rather
// than taking it as server-rendered children: with server children here, saving a review sometimes
// left the form pending forever (the router applied the update, React never committed it).
export function OwnReview({
  review,
  username,
  date,
  playgroundId,
  locale,
}: {
  review: { id: string; rating: number; comment: string | null };
  username: string;
  date: string;
  playgroundId: string;
  locale: string;
}) {
  const t = useTranslations("detail");
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <ReviewForm playgroundId={playgroundId} locale={locale} review={review} onDone={() => setEditing(false)} />;
  }
  return (
    <>
      <ReviewBody username={username} rating={review.rating} date={date} comment={review.comment} />
      <div className="mt-1 flex items-center gap-2">
        <button type="button" onClick={() => setEditing(true)} className="btn btn-ghost gap-1">
          <Pencil className="size-4" aria-hidden />
          {t("editReview")}
        </button>
        <DeleteReviewButton reviewId={review.id} playgroundId={playgroundId} locale={locale} />
      </div>
    </>
  );
}
