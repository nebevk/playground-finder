import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getReviewsForPlayground } from "@/lib/reviews";
import { RatingSummary } from "@/components/RatingSummary";
import { ReviewForm } from "./ReviewForm";
import { HelpfulButton } from "./HelpfulButton";
import { OwnReview } from "./OwnReview";
import { ReviewBody } from "./ReviewBody";
import { ReportButton } from "./ReportButton";

export async function ReviewsSection({
  playgroundId,
  locale,
}: {
  playgroundId: string;
  locale: string;
}) {
  const t = await getTranslations("detail");
  const user = await getCurrentUser();

  const reviews = await getReviewsForPlayground(playgroundId, user?.id ?? null);
  const loginHref = { pathname: "/login", query: { next: `/${locale}/playground/${playgroundId}` } };
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
    // `id`: the profile's "my reviews" link straight here.
    <section id="reviews" className="scroll-mt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("reviews")}</h2>
        {reviews.length > 0 && <RatingSummary avg={avgRating} count={reviews.length} />}
      </div>

      {/* One state, one action (design critique, BL-56). Signing in returns here (BL-55). */}
      {reviews.length === 0 && <p className="mb-3 text-sm text-base-content/70">{t("noReviews")}</p>}
      {!user ? (
        <Link href={loginHref} className={reviews.length === 0 ? "btn btn-primary" : "btn btn-outline"}>
          {reviews.length === 0 ? t("loginToWriteFirst") : t("loginToReview")}
        </Link>
      ) : myReview ? (
        <p className="text-sm text-base-content/70">{t("yourReview")}</p>
      ) : (
        <ReviewForm playgroundId={playgroundId} locale={locale} />
      )}

      {reviews.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-box border border-base-300 bg-base-200/50 p-4">
              {r.is_mine ? (
                <OwnReview
                  review={{ id: r.id, rating: r.rating, comment: r.comment }}
                  username={r.username}
                  date={dateFmt.format(new Date(r.created_at))}
                  playgroundId={playgroundId}
                  locale={locale}
                />
              ) : (
                <>
                  <ReviewBody
                    username={r.username}
                    rating={r.rating}
                    date={dateFmt.format(new Date(r.created_at))}
                    comment={r.comment}
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <HelpfulButton
                      reviewId={r.id}
                      playgroundId={playgroundId}
                      count={r.helpful_count}
                      marked={r.i_marked_helpful}
                      disabled={!user}
                      locale={locale}
                    />
                    {user && (
                      <ReportButton
                        targetType="review"
                        targetId={r.id}
                        playgroundId={playgroundId}
                        locale={locale}
                      />
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
