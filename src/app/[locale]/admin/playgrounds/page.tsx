import { getTranslations, setRequestLocale } from "next-intl/server";
import { isEquipmentKey, PLAYGROUND_FEATURE_KEYS, surfacesIn, type FeatureKey } from "@/lib/playground-types";
import { ArrowLeft, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import { EmptyState } from "@/components/EmptyState";
import {
  AdminPlaygroundsTable,
  type AdminPlaygroundRow,
} from "@/components/Admin/AdminPlaygroundsTable";

export default async function AdminPlaygroundsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { supabase } = await requireAdmin();
  const t = await getTranslations("admin");

  // Admins see all rows (incl. flagged) via the admin RLS policy; the view carries
  // review_count so the table can sort/filter on engagement.
  const { data } = await supabase
    .from("playgrounds_geo")
    .select(
      "id, name, description, surfaces, is_fenced, has_shade, has_water, has_toilets, has_parking, has_benches, has_toddler_area, is_accessible, has_lighting, equipment, flagged, review_count, created_at",
    )
    .order("created_at", { ascending: false });

  const rows: AdminPlaygroundRow[] = (data ?? []).flatMap((r) => {
    if (r.id == null || r.name == null) return [];
    return [
      {
        id: r.id,
        name: r.name,
        description: r.description,
        surfaces: Array.isArray(r.surfaces) ? surfacesIn(r.surfaces) : [],
        ...(Object.fromEntries(PLAYGROUND_FEATURE_KEYS.map((k) => [k, r[k] ?? false])) as Record<FeatureKey, boolean>),
        equipment: Array.isArray(r.equipment) ? r.equipment.filter(isEquipmentKey) : [],
        flagged: r.flagged ?? false,
        review_count: r.review_count ?? 0,
        created_at: r.created_at ?? new Date(0).toISOString(),
      },
    ];
  });

  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/admin" className="link link-hover inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden />
        {t("title")}
      </Link>

      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("playgrounds.title")}</h1>
        <Link href="/admin/add" className="btn btn-primary btn-sm gap-1">
          <Plus className="size-4" aria-hidden />
          {t("playgrounds.new")}
        </Link>
      </header>

      {rows.length === 0 ? (
        <EmptyState variant="playgrounds" title={t("playgrounds.empty")} />
      ) : (
        <AdminPlaygroundsTable rows={rows} locale={locale} />
      )}
    </section>
  );
}
