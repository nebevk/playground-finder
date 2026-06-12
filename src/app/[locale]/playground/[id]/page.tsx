import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Check, Navigation } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlaygroundById, PLAYGROUND_FEATURE_KEYS } from "@/lib/playgrounds";
import { directionsUrl } from "@/lib/directions";
import { StaticMapClient } from "@/components/Map/StaticMapClient";
import { ReviewsSection } from "@/components/Reviews/ReviewsSection";
import { ReportButton } from "@/components/Reviews/ReportButton";
import { RatingSummary } from "@/components/RatingSummary";
import { RecordView } from "@/components/RecordView";
import { EmptyState } from "@/components/EmptyState";

export default async function PlaygroundDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const playground = await getPlaygroundById(id);
  if (!playground) notFound();

  const t = await getTranslations("detail");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const activeFeatures = PLAYGROUND_FEATURE_KEYS.filter((k) => playground[k]);
  const [hero, ...restPhotos] = playground.photos;

  return (
    <article className="flex flex-col">
      <RecordView id={playground.id} />
      {hero && (
        <div className="relative h-56 w-full overflow-hidden md:h-72">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero.url}
            alt={playground.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-base-100/90 via-base-100/20 to-transparent" />
          <Link
            href="/"
            className="btn btn-circle btn-sm absolute top-4 left-4 bg-base-100/90 backdrop-blur"
            aria-label={t("backToMap")}
          >
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-6 p-4">
        {!hero && (
          <Link href="/" className="link link-hover inline-flex items-center gap-1 text-sm">
            <ArrowLeft className="size-4" aria-hidden />
            {t("backToMap")}
          </Link>
        )}

        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold leading-tight">{playground.name}</h1>
            <div className="mt-1.5">
              <RatingSummary
                avg={playground.avg_rating}
                count={playground.review_count}
                size="lg"
              />
            </div>
            {playground.description && (
              <p className="mt-2 text-base-content/70">{playground.description}</p>
            )}
          </div>
          {user && (
            <ReportButton
              targetType="playground"
              targetId={playground.id}
              playgroundId={playground.id}
              locale={locale}
              label={t("report")}
            />
          )}
        </header>

        <section className="flex flex-col gap-3">
          <div className="h-56 overflow-hidden rounded-box border border-base-300">
            <StaticMapClient lat={playground.lat} lng={playground.lng} />
          </div>
          <a
            href={directionsUrl(playground.lat, playground.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary w-full gap-2"
          >
            <Navigation className="size-5" aria-hidden />
            {t("directions")}
          </a>
        </section>

        {activeFeatures.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">{t("features")}</h2>
            <ul className="flex flex-wrap gap-2">
              {activeFeatures.map((key) => (
                <li key={key} className="badge badge-primary gap-1 px-3 py-3">
                  <Check className="size-3" aria-hidden />
                  {t(`feature.${key}`)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {playground.surface_type && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">{t("surface")}</h2>
            <span className="badge badge-outline px-3 py-3">
              {t(`surfaceOption.${playground.surface_type}`)}
            </span>
          </section>
        )}

        {playground.equipment.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">{t("equipment")}</h2>
            <ul className="flex flex-wrap gap-2">
              {playground.equipment.map((item) => (
                <li key={item} className="badge badge-ghost px-3 py-3">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-lg font-semibold">{t("photos")}</h2>
          {playground.photos.length === 0 ? (
            <EmptyState variant="photos" title={t("noPhotos")} />
          ) : restPhotos.length === 0 ? null : (
            <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {restPhotos.map((photo) => (
                <li
                  key={photo.id}
                  className="relative aspect-square overflow-hidden rounded-box bg-base-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={playground.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  {user && (
                    <div className="absolute top-1 right-1">
                      <ReportButton
                        targetType="photo"
                        targetId={photo.id}
                        playgroundId={playground.id}
                        locale={locale}
                        size="xs"
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <ReviewsSection playgroundId={playground.id} locale={locale} />
      </div>
    </article>
  );
}
