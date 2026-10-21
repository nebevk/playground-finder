import { Star } from "lucide-react";

// How everyone sees a review: author, stars, date and comment. No hooks, so both the server list
// and the client OwnReview render it.
export function ReviewBody({
  username,
  rating,
  date,
  comment,
}: {
  username: string;
  rating: number;
  /** Already formatted, so server and client agree. */
  date: string;
  comment: string | null;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-semibold text-sm">{username}</span>
        <span className="flex items-center" aria-label={`${rating}/5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={`size-4 ${n <= rating ? "fill-warning stroke-warning" : "stroke-base-content/30"}`}
              aria-hidden
            />
          ))}
        </span>
        <span className="text-xs text-base-content/60">{date}</span>
      </div>
      {comment && <p className="mt-2 text-sm text-base-content/80">{comment}</p>}
    </div>
  );
}
