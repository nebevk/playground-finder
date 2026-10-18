import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Navigation } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { EQUIPMENT_KEYS, getPlaygroundById, PLAYGROUND_FEATURE_KEYS, type EquipmentKey } from "@/lib/playgrounds";
import { directionsUrl } from "@/lib/directions";
import { StaticMapClient } from "@/components/Map/StaticMapClient";
import { ReviewsSection } from "@/components/Reviews/ReviewsSection";
import { ReportButton } from "@/components/Reviews/ReportButton";
import { RatingSummary } from "@/components/RatingSummary";
import { RecordView } from "@/components/RecordView";
import { FEATURE_ICONS, FeatureBadge, SURFACE_ICON } from "@/components/FeatureChip";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const playground = await getPlaygroundById(id);
  if (!playground) return {};

  // No user photos as preview images: link previews copy them onto other platforms' servers,
  // beyond moderation and deletion (GDPR-16). The site-wide preview image applies instead.
  return {
    title: playground.name,
    description: playground.description ?? undefined,
    openGraph: {
      title: playground.name,
      description: playground.description ?? undefined,
    },
  };
}

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

  const [hero, ...restPhotos] = playground.photos;
  const knownEquipment = playground.equipment.filter((e): e is EquipmentKey =>
    (EQUIPMENT_KEYS as readonly string[]).includes(e),
  );

  return (
    <article className="flex flex-col">
      <RecordView id={playground.id} />
      {hero && (
        <div className="relative h-56 w-full overflow-hidden md:h-72">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero.url} alt={t("photoAlt", { name: playground.name, n: 1 })} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-base-100/90 via-base-100/20 to-transparent" />
          <Link
            href="/map"
            className="btn btn-circle absolute top-4 left-4 bg-base-100/90 backdrop-blur"
            aria-label={t("backToMap")}
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          {user && (
            <div className="absolute top-4 right-4 rounded-full bg-base-100/90 backdrop-blur">
              <ReportButton targetType="photo" targetId={hero.id} playgroundId={playground.id} locale={locale} />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-6 p-4">
        {!hero && (
          <Link href="/map" className="btn btn-ghost -ml-4 gap-1 self-start">
            <ArrowLeft className="size-5" aria-hidden />
            {t("backToMap")}
          </Link>
        )}

        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold leading-tight">{playground.name}</h1>
            {playground.review_count > 0 && (
              <div className="mt-1.5">
                <RatingSummary avg={playground.avg_rating} count={playground.review_count} size="lg" />
              </div>
            )}
            {playground.description && <p className="mt-2 text-base-content/80">{playground.description}</p>}
          </div>
          {user && (
            <ReportButton
              targetType="playground"
              targetId={playground.id}
              playgroundId={playground.id}
              locale={locale}
              label={t("reportPlayground")}
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
            className="btn btn-primary w-full gap-2 md:w-auto md:self-start"
          >
            <Navigation className="size-5" aria-hidden />
            {t("directions")}
          </a>
        </section>

        {/* All five features: unreported ones say so, rather than looking like "no". */}
        <section>
          <h2 className="mb-2 text-lg font-semibold">{t("features")}</h2>
          <ul className="flex flex-wrap gap-2">
            {PLAYGROUND_FEATURE_KEYS.map((key) => (
              <FeatureBadge
                key={key}
                icon={FEATURE_ICONS[key]}
                label={t(`feature.${key}`)}
                missing={!playground[key]}
                missingLabel={t("noData")}
              />
            ))}
            <FeatureBadge
              icon={SURFACE_ICON}
              label={playground.surface_type ? t(`surfaceOption.${playground.surface_type}`) : t("surface")}
              missing={!playground.surface_type}
              missingLabel={t("noData")}
            />
          </ul>
        </section>

        {knownEquipment.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">{t("equipment")}</h2>
            <ul className="flex flex-wrap gap-2">
              {knownEquipment.map((item) => (
                <li key={item} className="badge badge-ghost h-auto min-h-7 py-1">
                  {t(`equipmentOptions.${item}`)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* A lone photo is already the hero, so the section only lists the rest. */}
        {(!hero || restPhotos.length > 0) && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">{t("photos")}</h2>
            {!hero ? (
              <p className="text-sm text-base-content/70">{t("noPhotos")}</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {restPhotos.map((photo, i) => (
                  <li key={photo.id} className="relative aspect-square overflow-hidden rounded-box bg-base-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={t("photoAlt", { name: playground.name, n: i + 2 })}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {user && (
                      <div className="absolute top-1 right-1 rounded-full bg-base-100/90">
                        <ReportButton targetType="photo" targetId={photo.id} playgroundId={playground.id} locale={locale} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <ReviewsSection playgroundId={playground.id} locale={locale} />
      </div>
    </article>
  );
}
