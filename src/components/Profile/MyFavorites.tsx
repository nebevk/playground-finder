import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FavoriteButton, FavoritesProvider } from "@/components/Favorites";
import { LinkPending } from "@/components/LinkPending";
import { getMyFavorites } from "@/lib/favorites";

// The profile's "Priljubljena igrišča" (FR-PG-04): the playgrounds this person saved with the heart,
// newest first. The heart removes one here too; the row stays until the page is opened again.
export async function MyFavorites({ userId }: { userId: string }) {
  const t = await getTranslations("profile.favorites");
  const favorites = await getMyFavorites(userId);

  return (
    <section aria-labelledby="favorites">
      <h2 id="favorites" className="mb-2 text-lg font-semibold">
        {t("title")}
      </h2>
      {favorites.length === 0 ? (
        <p className="text-sm text-base-content/70">{t("empty")}</p>
      ) : (
        <FavoritesProvider signedIn initial={favorites.map((f) => f.id)}>
          <ul className="list -mx-2">
            {favorites.map((f) => (
              <li key={f.id} className="list-row items-center gap-2 px-2 py-1">
                <Link
                  href={`/playground/${f.id}`}
                  className="list-col-grow flex min-h-11 min-w-0 items-center gap-2 font-semibold hover:underline"
                >
                  <span className="truncate">{f.name}</span>
                  <LinkPending />
                </Link>
                <FavoriteButton playgroundId={f.id} />
              </li>
            ))}
          </ul>
        </FavoritesProvider>
      )}
    </section>
  );
}
