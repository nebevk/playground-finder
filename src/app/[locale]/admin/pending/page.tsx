import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import { osmFeatureUrl, osmPinUrl } from "@/lib/osm";
import { usernamesById } from "@/lib/profiles";
import {
  EQUIPMENT_KEYS,
  isEquipmentKey,
  isPlaygroundSource,
  PLAYGROUND_FEATURE_KEYS,
  surfacesIn,
  type FeatureKey,
} from "@/lib/playground-types";
import { EmptyState } from "@/components/EmptyState";
import { EditPlaygroundForm } from "@/components/Admin/EditPlaygroundForm";
import { setPlaygroundStatusAction } from "../actions";

// Playgrounds waiting for review: discoveries (ADR-0003, FR-ADM-07). Nothing here is public until an
// admin publishes it; rejected ones stay rejected, so discovery doesn't propose them again.
const SHOWN = 50;
const RECENTLY_REJECTED = 20;
const NEARBY_M = 150;

export default async function PendingPlaygroundsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { supabase } = await requireAdmin();
  const t = await getTranslations("admin.pending");
  const tDetail = await getTranslations("detail");
  const tSurf = await getTranslations("add.step2.surfaceOptions");
  const tAdmin = await getTranslations("admin");

  // Admins read every row (the admin RLS policy); the view has the coordinates.
  const [pending, rejected] = await Promise.all([
    supabase
      .from("playgrounds_geo")
      .select(
        "id, name, description, lat, lng, surfaces, equipment, is_fenced, has_shade, has_water, has_toilets, has_parking, has_benches, has_toddler_area, is_accessible, has_lighting, source, external_id, source_notes, user_id, created_at",
        { count: "exact" },
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(SHOWN),
    supabase
      .from("playgrounds")
      .select("id, name")
      .eq("status", "rejected")
      .order("created_at", { ascending: false })
      .limit(RECENTLY_REJECTED),
  ]);
  if (pending.error) console.error("pending queue: query failed", pending.error);
  const total = pending.count ?? 0;

  const rows = (pending.data ?? []).flatMap((r) => {
    if (r.id == null || r.name == null || r.lat == null || r.lng == null) return [];
    const known = Object.fromEntries(PLAYGROUND_FEATURE_KEYS.map((k) => [k, r[k]])) as Record<FeatureKey, boolean | null>;
    return [
      {
        id: r.id,
        name: r.name,
        description: r.description,
        lat: r.lat,
        lng: r.lng,
        known,
        surfaces: Array.isArray(r.surfaces) ? surfacesIn(r.surfaces) : [],
        equipment: Array.isArray(r.equipment) ? r.equipment.filter(isEquipmentKey) : [],
        source: isPlaygroundSource(r.source) ? r.source : "other",
        externalId: r.external_id,
        notes: r.source_notes,
        userId: r.user_id,
        createdAt: r.created_at,
      },
    ];
  });

  // Playgrounds near each one, of any status: the reviewer spots a duplicate, including one that
  // was already rejected.
  const nearby = await Promise.all(
    rows.map(async (r) => {
      const { data, error } = await supabase.rpc("playgrounds_near", { p_lat: r.lat, p_lng: r.lng, p_radius_m: NEARBY_M });
      if (error) console.error("pending queue: nearby lookup failed", error);
      return (data ?? []).filter((n) => n.id !== r.id);
    }),
  );
  const nearbyIds = [...new Set(nearby.flat().map((n) => n.id))];
  const { data: nearbyRows } = nearbyIds.length
    ? await supabase.from("playgrounds").select("id, status").in("id", nearbyIds)
    : { data: [] };
  const statusById = new Map((nearbyRows ?? []).map((n) => [n.id, n.status]));

  const authors = await usernamesById(
    supabase,
    rows.flatMap((r) => (r.userId ? [r.userId] : [])),
  );
  const dateFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });

  return (
    <section className="flex flex-col gap-6 p-4">
      <Link href="/admin" className="btn btn-ghost -ml-4 gap-1 self-start">
        <ArrowLeft className="size-5" aria-hidden />
        {tAdmin("title")}
      </Link>

      <header>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-base-content/70">{t("intro")}</p>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("waitingHeading", { count: total })}</h2>
        {rows.length === 0 ? (
          <EmptyState variant="playgrounds" title={t("empty")} />
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((r, i) => {
              const featureUrl = osmFeatureUrl(r.source, r.externalId);
              const details = [
                ...PLAYGROUND_FEATURE_KEYS.flatMap((k) =>
                  r.known[k] === true ? [tDetail(`feature.${k}`)] : r.known[k] === false ? [tDetail(`featureAbsent.${k}`)] : [],
                ),
                ...r.surfaces.map((s) => tSurf(s)),
                ...EQUIPMENT_KEYS.filter((k) => r.equipment.includes(k)).map((k) => tDetail(`equipmentOptions.${k}`)),
              ];
              const author = r.userId ? authors.get(r.userId) : undefined;
              return (
                <li key={r.id} className="rounded-box border border-base-300 p-4">
                  <article aria-labelledby={`pending-${r.id}`} className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs uppercase text-base-content/70">
                        {author ? t("addedBy", { name: author }) : t(`source.${r.source}`)}
                        {r.createdAt && <> · {dateFmt.format(new Date(r.createdAt))}</>}
                      </p>
                      <h3 id={`pending-${r.id}`} className="text-lg font-semibold">
                        {r.name}
                      </h3>
                      {r.description && <p className="mt-1 text-sm text-base-content/70">{r.description}</p>}
                    </div>

                    <div className="flex flex-wrap gap-x-4">
                      <a
                        href={osmPinUrl(r.lat, r.lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link link-primary inline-flex min-h-11 items-center gap-1 text-sm"
                      >
                        {t("showPin")}
                        <ExternalLink className="size-4" aria-hidden />
                      </a>
                      {featureUrl && (
                        <a
                          href={featureUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link link-primary inline-flex min-h-11 items-center gap-1 text-sm"
                        >
                          {t("openFeature")}
                          <ExternalLink className="size-4" aria-hidden />
                        </a>
                      )}
                    </div>

                    {details.length > 0 ? (
                      <ul className="flex flex-wrap gap-2" aria-label={t("detailsLabel")}>
                        {details.map((d) => (
                          <li key={d} className="badge badge-ghost">
                            {d}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-base-content/60">{t("noDetails")}</p>
                    )}

                    {r.notes && (
                      <p className="text-sm wrap-break-word">
                        <span className="font-semibold">{t("notes")}:</span> {r.notes}
                      </p>
                    )}

                    <div>
                      <h4 className="text-sm font-semibold">{t("nearbyHeading", { distance: NEARBY_M })}</h4>
                      {nearby[i].length === 0 ? (
                        <p className="text-sm text-base-content/60">{t("nearbyNone")}</p>
                      ) : (
                        <ul className="text-sm">
                          {nearby[i].map((n) => {
                            const status = statusById.get(n.id);
                            const distance = t("distance", { distance: Math.round(n.distance_m) });
                            return (
                              <li key={n.id} className="flex min-h-11 flex-wrap items-center gap-x-1">
                                {status === "published" ? (
                                  <Link href={`/playground/${n.id}`} className="link link-primary inline-flex min-h-11 items-center">
                                    {n.name}
                                  </Link>
                                ) : (
                                  <span>{n.name}</span>
                                )}
                                <span className="text-base-content/70">
                                  · {distance}
                                  {(status === "pending" || status === "rejected") && <> · {t(`nearbyStatus.${status}`)}</>}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <form action={setPlaygroundStatusAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="published" />
                        <input type="hidden" name="locale" value={locale} />
                        <button type="submit" className="btn btn-success">
                          {t("publish")}
                        </button>
                      </form>
                      <EditPlaygroundForm
                        playground={{
                          id: r.id,
                          name: r.name,
                          description: r.description,
                          surfaces: r.surfaces,
                          equipment: r.equipment,
                          ...(Object.fromEntries(PLAYGROUND_FEATURE_KEYS.map((k) => [k, r.known[k] === true])) as Record<
                            FeatureKey,
                            boolean
                          >),
                        }}
                        locale={locale}
                        untickedUnknown
                        triggerClassName="btn btn-outline gap-1"
                        trigger={
                          <>
                            <Pencil className="size-4" aria-hidden />
                            {t("edit")}
                          </>
                        }
                      />
                      <form action={setPlaygroundStatusAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="rejected" />
                        <input type="hidden" name="locale" value={locale} />
                        <button type="submit" className="btn btn-error btn-outline">
                          {t("reject")}
                        </button>
                      </form>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
        {total > rows.length && (
          <p className="mt-3 text-sm text-base-content/70">{t("shownOf", { shown: rows.length, total })}</p>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">{t("rejectedHeading")}</h2>
        <p className="mb-3 text-sm text-base-content/70">{t("rejectedHelp")}</p>
        {(rejected.data ?? []).length === 0 ? (
          <p className="text-sm text-base-content/60">{t("rejectedEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-2" aria-label={t("rejectedHeading")}>
            {(rejected.data ?? []).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-box border border-base-300 py-1 pr-1 pl-4"
              >
                <span className="min-w-0 wrap-break-word">{r.name}</span>
                <form action={setPlaygroundStatusAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value="published" />
                  <input type="hidden" name="locale" value={locale} />
                  <button type="submit" className="btn btn-ghost" aria-label={t("publishNamed", { name: r.name })}>
                    {t("publish")}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
