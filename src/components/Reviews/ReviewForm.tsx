"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import {
  submitReviewAction,
  updateReviewAction,
  type ReviewState,
} from "@/app/[locale]/playground/[id]/actions";
import { REVIEW_COMMENT_MAX } from "@/lib/limits";

// Writing a review, or editing your own (FR-COM-02) when `review` is given: prefilled, with
// Save and Cancel. `onDone` runs after a successful edit.
export function ReviewForm({
  playgroundId,
  locale,
  review,
  onDone,
}: {
  playgroundId: string;
  locale: string;
  review?: { id: string; rating: number; comment: string | null };
  onDone?: () => void;
}) {
  const t = useTranslations("detail");
  const tCommon = useTranslations("common");
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const commentLabel = useId();
  const [state, action, pending] = useActionState<ReviewState, FormData>(
    review ? updateReviewAction : submitReviewAction,
    undefined,
  );

  useEffect(() => {
    if (state?.success) onDone?.();
  }, [state, onDone]);

  return (
    // Editing happens inside the review's own card, so only a new review gets a card of its own.
    // Kept compact: the legends lose DaisyUI's top padding, the stars sit flush with their legend.
    <form
      action={action}
      className={`flex flex-col gap-2 ${review ? "" : "rounded-box border border-base-300 bg-base-200/50 p-3"}`}
    >
      <input type="hidden" name="playground_id" value={playgroundId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="rating" value={rating} />
      {review && <input type="hidden" name="review_id" value={review.id} />}

      <fieldset className="fieldset py-0">
        <legend className="fieldset-legend pt-0 text-sm">{t("rating")}</legend>
        {/* -ms-2.5: the first 24 px star lines up with the legend inside its 44 px button. */}
        <div className="-ms-2.5 flex items-center">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={t("starLabel", { n })}
                aria-pressed={rating === n}
                className="btn btn-ghost btn-circle p-0"
              >
                <Star
                  className={`size-6 ${filled ? "fill-star stroke-star-edge" : "stroke-base-content/40"}`}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="fieldset py-0">
        <legend id={commentLabel} className="fieldset-legend pt-0 text-sm">
          {t("comment")}
        </legend>
        <textarea
          aria-labelledby={commentLabel}
          name="comment"
          rows={2}
          maxLength={REVIEW_COMMENT_MAX}
          defaultValue={review?.comment ?? ""}
          className="textarea min-h-16 w-full"
          placeholder={t("commentPlaceholder")}
        />
      </fieldset>

      {state?.error && (
        <p role="alert" className="text-sm text-error">
          {state.error === "duplicate" && t("reviewError.duplicate")}
          {state.error === "bad_rating" && t("reviewError.bad_rating")}
          {state.error === "too_long" && t("reviewError.too_long", { max: REVIEW_COMMENT_MAX })}
          {state.error === "rate_limited" && t("reviewError.rate_limited")}
          {(state.error === "generic" || state.error === "auth_required") && t("reviewError.generic")}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending || rating === 0} className="btn btn-primary">
          {pending && <span className="loading loading-spinner loading-xs" aria-hidden />}
          {review ? t("saveReview") : t("submitReview")}
        </button>
        {review && (
          <button type="button" onClick={onDone} className="btn btn-ghost">
            {tCommon("cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
