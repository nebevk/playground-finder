import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import { PLAYGROUND_FEATURE_KEYS } from "@/lib/playground-types";
import { haversineMeters } from "@/lib/geo";

type Row = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string | null;
  surface_type: string | null;
  review_count: number;
  hasFeature: boolean;
  hasPhoto: boolean;
};

const NEARBY_M = 60;

export default async function AdminQualityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { supabase } = await requireAdmin();
  const t = await getTranslations("admin.quality");

  const [{ data: pgData }, { data: photoData }] = await Promise.all([
    supabase
      .from("playgrounds_geo")
      .select(
        "id, name, lat, lng, description, surface_type, review_count, is_fenced, has_shade, has_water, has_toilets, has_parking",
      ),
    supabase.from("photos").select("playground_id"),
  ]);

  const photoSet = new Set((photoData ?? []).map((p) => p.playground_id));

  const rows: Row[] = (pgData ?? []).flatMap((r) => {
    if (r.id == null || r.name == null || r.lat == null || r.lng == null) return [];
    return [
      {
        id: r.id,
        name: r.name,
        lat: r.lat,
        lng: r.lng,
        description: r.description,
        surface_type: r.surface_type,
        review_count: r.review_count ?? 0,
        hasFeature: PLAYGROUND_FEATURE_KEYS.some((k) => r[k]),
        hasPhoto: photoSet.has(r.id),
      },
    ];
  });

  const noPhotos = rows.filter((r) => !r.hasPhoto);
  const noDescription = rows.filter((r) => !r.description?.trim());
  const noDetails = rows.filter((r) => !r.hasFeature && !r.surface_type);
  const noReviews = rows.filter((r) => r.review_count === 0);

  // Duplicate names (case-insensitive).
  const byName = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.name.trim().toLowerCase();
    (byName.get(key) ?? byName.set(key, []).get(key)!).push(r);
  }
  const duplicateNames = [...byName.values()].filter((g) => g.length > 1);

  // Nearby pairs (possible duplicates) — O(n^2), fine at alpha scale.
  const nearbyPairs: { a: Row; b: Row; dist: number }[] = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const d = haversineMeters(rows[i].lat, rows[i].lng, rows[j].lat, rows[j].lng);
      if (d <= NEARBY_M) nearbyPairs.push({ a: rows[i], b: rows[j], dist: Math.round(d) });
    }
  }
  nearbyPairs.sort((x, y) => x.dist - y.dist);

  const totalIssues =
    noPhotos.length +
    noDescription.length +
    noDetails.length +
    noReviews.length +
    duplicateNames.length +
    nearbyPairs.length;

  const pgLink = (r: Row) => (
    <Link href={`/playground/${r.id}`} target="_blank" className="link link-hover">
      {r.name}
    </Link>
  );

  return (
    <section className="flex flex-col gap-6 p-4">
      <Link href="/admin" className="link link-hover inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden />
        Admin
      </Link>

      <header>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-base-content/70">{t("intro")}</p>
      </header>

      {totalIssues === 0 ? (
        <p className="rounded-box border border-primary/30 bg-primary/5 p-6 text-center font-semibold">
          {t("allGood")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <ListSection title={t("noPhotos")} count={noPhotos.length} emptyLabel={t("sectionEmpty")}>
            {noPhotos.map((r) => (
              <li key={r.id}>{pgLink(r)}</li>
            ))}
          </ListSection>

          <ListSection
            title={t("noReviews")}
            count={noReviews.length}
            emptyLabel={t("sectionEmpty")}
          >
            {noReviews.map((r) => (
              <li key={r.id}>{pgLink(r)}</li>
            ))}
          </ListSection>

          <ListSection
            title={t("noDescription")}
            count={noDescription.length}
            emptyLabel={t("sectionEmpty")}
          >
            {noDescription.map((r) => (
              <li key={r.id}>{pgLink(r)}</li>
            ))}
          </ListSection>

          <ListSection
            title={t("noDetails")}
            count={noDetails.length}
            emptyLabel={t("sectionEmpty")}
          >
            {noDetails.map((r) => (
              <li key={r.id}>{pgLink(r)}</li>
            ))}
          </ListSection>

          <ListSection
            title={t("duplicateNames")}
            count={duplicateNames.length}
            emptyLabel={t("sectionEmpty")}
          >
            {duplicateNames.map((group) => (
              <li key={group[0].id}>
                {group.map((r, i) => (
                  <span key={r.id}>
                    {i > 0 && " · "}
                    {pgLink(r)}
                  </span>
                ))}
              </li>
            ))}
          </ListSection>

          <ListSection
            title={t("nearbyDuplicates")}
            count={nearbyPairs.length}
            emptyLabel={t("sectionEmpty")}
          >
            {nearbyPairs.map(({ a, b, dist }) => (
              <li key={`${a.id}-${b.id}`}>
                {pgLink(a)} · {pgLink(b)}{" "}
                <span className="text-base-content/50">
                  ({t("distanceApart", { distance: dist })})
                </span>
              </li>
            ))}
          </ListSection>
        </div>
      )}
    </section>
  );
}

function ListSection({
  title,
  count,
  emptyLabel,
  children,
}: {
  title: string;
  count: number;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="collapse-arrow collapse border border-base-300 bg-base-100">
      <input type="checkbox" defaultChecked={count > 0} />
      <div className="collapse-title flex items-center gap-2 font-semibold">
        {title}
        <span className={`badge badge-sm ${count > 0 ? "badge-warning" : "badge-ghost"}`}>
          {count}
        </span>
      </div>
      <div className="collapse-content">
        {count === 0 ? (
          <p className="text-sm text-base-content/50">{emptyLabel}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">{children}</ul>
        )}
      </div>
    </div>
  );
}
