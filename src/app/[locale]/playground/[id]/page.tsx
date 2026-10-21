import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, ImagePlus, Navigation, Pencil } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { EQUIPMENT_KEYS, getPlaygroundById, PLAYGROUND_FEATURE_KEYS, type EquipmentKey } from "@/lib/playgrounds";
import { directionsUrl } from "@/lib/directions";
import { StaticMapClient } from "@/components/Map/StaticMapClient";
import { ReviewsSection } from "@/components/Reviews/ReviewsSection";
import { ReportButton } from "@/components/Reviews/ReportButton";
import { RatingSummary } from "@/components/RatingSummary";
import { RecordView } from "@/components/RecordView";
import { FEATURE_ICONS, FeatureBadge, SURFACE_ICON } from "@/components/FeatureChip";
import { PhotoButton, PhotoViewer } from "@/components/Photos/PhotoViewer";
import { FlashToast } from "@/components/Toast/FlashToast";
import { FavoriteButton, FavoritesProvider } from "@/components/Favorites";
import { getFavoriteIds } from "@/lib/favorites";
import { PendingIcon } from "@/components/LinkPending";

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
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ updated?: string; photos?: string }>;
}) {
  const { locale, id } = await params;
  const { updated, photos: photosParam } = await searchParams;
  setRequestLocale(locale);

  const playground = await getPlaygroundById(id);
  if (!playground) notFound();

  const t = await getTranslations("detail");
  const user = await getCurrentUser();
  // The person who added it may edit it (FR-ADD-08); the database enforces the same on save.
  const isOwner = !!user && playground.user_id === user.id;
  const isFavorite = !!user && (await getFavoriteIds(user.id)).includes(playground.id);

  const [hero, ...restPhotos] = playground.photos;
  const photoCount = playground.photos.length;
  const knownEquipment = playground.equipment.filter((e): e is EquipmentKey =>
    (EQUIPMENT_KEYS as readonly string[]).includes(e),
  );

  return (
    <PhotoViewer
      photos={playground.photos.map((p, i) => ({ id: p.id, url: p.url, alt: t("photoAlt", { name: playground.name, n: i + 1 }) }))}
      playgroundId={playground.id}
      locale={locale}
      canReport={!!user}
    >
      {updated === "1" && <FlashToast message={t("updated")} />}
      {photosParam === "added" && <FlashToast message={t("photosAdded")} />}
      <article className="flex flex-col">
        <RecordView id={playground.id} />
        {hero && (
          <div className="relative h-56 w-full overflow-hidden md:h-72">
            {/* The photo as taken (no fog gradient over it); a tap opens the full-screen viewer,
                where photos can also be reported. */}
            <PhotoButton
              index={0}
              label={t("openPhoto", { n: 1, total: photoCount })}
              className="block h-full w-full cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero.url} alt="" className="h-full w-full object-cover" />
            </PhotoButton>
            <Link
              href="/map"
              className="btn btn-circle absolute top-4 left-4 bg-base-100 shadow-sm"
              aria-label={t("backToMap")}
            >
              <ArrowLeft className="size-5" aria-hidden />
            </Link>
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
            <div className="flex shrink-0 items-center">
              <FavoritesProvider signedIn={!!user} initial={isFavorite ? [playground.id] : []}>
                <FavoriteButton playgroundId={playground.id} />
              </FavoritesProvider>
              {isOwner ? (
                <Link href={`/playground/${playground.id}/edit`} className="btn btn-ghost shrink-0 gap-1">
                  <PendingIcon className="size-4">
                    <Pencil className="size-4" aria-hidden />
                  </PendingIcon>
                  {t("edit")}
                </Link>
              ) : (
                user && (
                  <ReportButton
                    targetType="playground"
                    targetId={playground.id}
                    playgroundId={playground.id}
                    locale={locale}
                    label={t("reportPlayground")}
                  />
                )
              )}
            </div>
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

          {/* All five features: what it has, and what it doesn't ("Brez stranišča": the add form's
              unticked box means "doesn't have it"). Only the optional surface can be unknown. */}
          <section>
            <h2 className="mb-2 text-lg font-semibold">{t("features")}</h2>
            <ul className="flex flex-wrap gap-2">
              {PLAYGROUND_FEATURE_KEYS.map((key) => (
                <FeatureBadge
                  key={key}
                  icon={FEATURE_ICONS[key]}
                  label={playground[key] ? t(`feature.${key}`) : t(`featureAbsent.${key}`)}
                  muted={!playground[key]}
                />
              ))}
              <FeatureBadge
                icon={SURFACE_ICON}
                label={playground.surface_type ? t(`surfaceOption.${playground.surface_type}`) : t("surface")}
                muted={!playground.surface_type}
                note={playground.surface_type ? undefined : t("noData")}
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

          {/* Anyone signed in can add photos (FR-ADD-06; the page asks visitors to sign in). A lone
              photo is already the hero, so the grid only lists the rest. */}
          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{t("photos")}</h2>
              <Link href={`/playground/${playground.id}/photos`} className="btn btn-ghost -me-3 gap-1">
                <PendingIcon className="size-4">
                  <ImagePlus className="size-4" aria-hidden />
                </PendingIcon>
                {t("addPhotos")}
              </Link>
            </div>
            {!hero ? (
              <p className="text-sm text-base-content/70">{t("noPhotos")}</p>
            ) : (
              restPhotos.length > 0 && (
                <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {restPhotos.map((photo, i) => (
                    <li key={photo.id} className="aspect-square overflow-hidden rounded-box bg-base-200">
                      <PhotoButton
                        index={i + 1}
                        label={t("openPhoto", { n: i + 2, total: photoCount })}
                        className="block h-full w-full cursor-zoom-in"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </PhotoButton>
                    </li>
                  ))}
                </ul>
              )
            )}
          </section>

          <ReviewsSection playgroundId={playground.id} locale={locale} />
        </div>
      </article>
    </PhotoViewer>
  );
}
