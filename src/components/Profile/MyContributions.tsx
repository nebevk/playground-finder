import { getTranslations } from "next-intl/server";
import { Pencil, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getMyContributions } from "@/lib/contributions";

// The profile's "Moji prispevki" (FR-COM-07): what this person has added, newest first. Items in
// review are listed with their status but without links: everyone else is shown a 404 for them.
// Playgrounds get an edit link (FR-ADD-08); reviews link to the playground's reviews, where your own
// can be edited or deleted (FR-COM-02).
export async function MyContributions({ userId }: { userId: string }) {
  const t = await getTranslations("profile.contributions");
  const tDetail = await getTranslations("detail");
  const { playgrounds, reviews, photos } = await getMyContributions(userId);

  const heading = (
    <h2 id="contributions" className="mb-3 text-lg font-semibold">
      {t("title")}
    </h2>
  );
  if (playgrounds.length + reviews.length + photos.length === 0) {
    return (
      <section aria-labelledby="contributions">
        {heading}
        <p className="text-sm text-base-content/70">{t("empty")}</p>
        <Link href="/add" className="btn btn-outline mt-3">
          {t("addFirst")}
        </Link>
      </section>
    );
  }

  const anyFlagged = [...playgrounds, ...reviews, ...photos].some((x) => x.flagged);
  const inReview = <span className="badge badge-ghost shrink-0">{t("inReview")}</span>;
  const subheading = (id: string, label: string, count: number) => (
    <h3 id={id} className="text-sm font-semibold text-base-content/70">
      {label} <span className="font-normal tabular-nums">({count})</span>
    </h3>
  );

  return (
    <section aria-labelledby="contributions" className="flex flex-col gap-5">
      <div>
        {heading}
        {anyFlagged && <p className="-mt-1 text-sm text-base-content/70">{t("flaggedNote")}</p>}
      </div>

      {playgrounds.length > 0 && (
        <section aria-labelledby="my-playgrounds">
          {subheading("my-playgrounds", t("playgrounds"), playgrounds.length)}
          {/* -mx-2 with the rows' px-2, as on Home: text lines up with the headings. */}
          <ul className="list -mx-2">
            {playgrounds.map((p) => (
              <li key={p.id} className="list-row items-center gap-3 px-2 py-1">
                {p.flagged ? (
                  <span className="list-col-grow min-w-0 truncate font-semibold">{p.name}</span>
                ) : (
                  <Link
                    href={`/playground/${p.id}`}
                    className="list-col-grow flex min-h-11 min-w-0 items-center font-semibold hover:underline"
                  >
                    <span className="truncate">{p.name}</span>
                  </Link>
                )}
                {p.flagged ? (
                  inReview
                ) : (
                  <Link
                    href={`/playground/${p.id}/edit`}
                    className="btn btn-ghost -me-2 gap-1"
                    aria-label={t("editNamed", { name: p.name })}
                  >
                    <Pencil className="size-4" aria-hidden />
                    {t("edit")}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {reviews.length > 0 && (
        <section aria-labelledby="my-reviews">
          {subheading("my-reviews", t("reviews"), reviews.length)}
          <ul className="list -mx-2">
            {reviews.map((r) => {
              const content = (
                <span className="list-col-grow min-w-0">
                  <span className="block truncate font-semibold">{r.playground?.name ?? t("unknownPlayground")}</span>
                  <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-base-content/70">
                    <span className="inline-flex shrink-0 items-center gap-1">
                      <Star className="size-3.5 fill-warning stroke-warning" aria-hidden />
                      <span className="sr-only">{tDetail("rating")} </span>
                      <span className="font-semibold text-base-content">{r.rating}</span>
                    </span>
                    {r.comment && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="min-w-0 truncate">{r.comment}</span>
                      </>
                    )}
                  </span>
                </span>
              );
              return (
                <li key={r.id} className="list-row items-center gap-3 px-2 py-0">
                  {r.flagged || !r.playground ? (
                    <div className="list-col-grow flex min-w-0 items-center gap-3 py-2.5">{content}</div>
                  ) : (
                    <Link
                      href={`/playground/${r.playground.id}#reviews`}
                      className="list-col-grow flex min-w-0 items-center py-2.5 hover:underline"
                    >
                      {content}
                    </Link>
                  )}
                  {r.flagged && inReview}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {photos.length > 0 && (
        <section aria-labelledby="my-photos">
          {subheading("my-photos", t("photos"), photos.length)}
          <ul className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-4">
            {photos.map((p) => (
              <li key={p.id} className="aspect-square overflow-hidden rounded-box bg-base-200">
                {p.url && p.playground && !p.flagged ? (
                  <Link href={`/playground/${p.playground.id}`} className="block h-full w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt={t("photoOf", { name: p.playground.name })}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </Link>
                ) : (
                  <span className="grid h-full w-full place-items-center p-2 text-center text-xs text-base-content/70">
                    {p.flagged ? t("inReview") : t("unknownPlayground")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
