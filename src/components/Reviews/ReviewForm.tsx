"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { submitReviewAction, type ReviewState } from "@/app/[locale]/playground/[id]/actions";

export function ReviewForm({
  playgroundId,
  locale,
}: {
  playgroundId: string;
  locale: string;
}) {
  const t = useTranslations("detail");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [state, action, pending] = useActionState<ReviewState, FormData>(
    submitReviewAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-3 rounded-box border border-base-300 p-4">
      <input type="hidden" name="playground_id" value={playgroundId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="rating" value={rating} />

      <fieldset>
        <legend className="mb-1 text-sm font-semibold">{t("rating")}</legend>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${n}`}
                className="btn btn-ghost btn-sm btn-circle p-0"
              >
                <Star
                  className={`size-6 ${filled ? "fill-warning stroke-warning" : "stroke-base-content/40"}`}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="form-control">
        <span className="label-text mb-1">{t("comment")}</span>
        <textarea
          name="comment"
          rows={3}
          className="textarea textarea-bordered w-full"
          placeholder={t("commentPlaceholder")}
        />
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-error">
          {state.error === "duplicate" && t("reviewError.duplicate")}
          {state.error === "bad_rating" && t("reviewError.bad_rating")}
          {(state.error === "generic" || state.error === "auth_required") && t("reviewError.generic")}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || rating === 0}
        className="btn btn-primary btn-sm self-start"
      >
        {pending && <span className="loading loading-spinner loading-xs" aria-hidden />}
        {t("submitReview")}
      </button>
    </form>
  );
}
