import { getTranslations } from "next-intl/server";
import { Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getReviewsForPlayground } from "@/lib/reviews";
import { EmptyState } from "@/components/EmptyState";
import { RatingSummary } from "@/components/RatingSummary";
import { ReviewForm } from "./ReviewForm";
import { HelpfulButton } from "./HelpfulButton";
import { DeleteReviewButton } from "./DeleteReviewButton";
import { ReportButton } from "./ReportButton";

export async function ReviewsSection({
  playgroundId,
  locale,
}: {
  playgroundId: string;
  locale: string;
}) {
  const t = await getTranslations("detail");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const reviews = await getReviewsForPlayground(playgroundId, user?.id ?? null);
  const myReview = reviews.find((r) => r.is_mine);

  const avgRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : null;

  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("reviews")}</h2>
        {reviews.length > 0 && <RatingSummary avg={avgRating} count={reviews.length} />}
      </div>

      {!user ? (
        <div className="rounded-box border border-base-300 bg-base-200/50 p-4 text-sm text-base-content/70">
          <Link href="/login" className="link link-primary">
            {t("loginToReview")}
          </Link>
        </div>
      ) : myReview ? (
        <p className="text-sm text-base-content/60">{t("yourReview")}</p>
      ) : (
        <ReviewForm playgroundId={playgroundId} locale={locale} />
      )}

      {reviews.length === 0 ? (
        <div className="mt-4">
          <EmptyState variant="reviews" title={t("noReviews")} />
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="rounded-box border border-base-300 bg-base-200/50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold text-sm">{r.username}</span>
                    <span className="flex items-center" aria-label={`${r.rating}/5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`size-4 ${
                            n <= r.rating ? "fill-warning stroke-warning" : "stroke-base-content/30"
                          }`}
                          aria-hidden
                        />
                      ))}
                    </span>
                    <span className="text-xs text-base-content/50">
                      {dateFmt.format(new Date(r.created_at))}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="mt-2 text-sm text-base-content/80">{r.comment}</p>
                  )}
                </div>
                {r.is_mine && (
                  <DeleteReviewButton
                    reviewId={r.id}
                    playgroundId={playgroundId}
                    locale={locale}
                  />
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <HelpfulButton
                  reviewId={r.id}
                  playgroundId={playgroundId}
                  count={r.helpful_count}
                  marked={r.i_marked_helpful}
                  disabled={!user || r.is_mine}
                  locale={locale}
                />
                {user && !r.is_mine && (
                  <ReportButton
                    targetType="review"
                    targetId={r.id}
                    playgroundId={playgroundId}
                    locale={locale}
                    size="xs"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
