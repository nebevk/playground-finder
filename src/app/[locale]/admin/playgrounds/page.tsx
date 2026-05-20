import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import { EditPlaygroundForm } from "@/components/Admin/EditPlaygroundForm";
import { DeletePlaygroundButton } from "@/components/Admin/DeletePlaygroundButton";
import { EmptyState } from "@/components/EmptyState";

const SURFACE_TYPES = ["tartan", "sand", "grass", "gravel"] as const;
type SurfaceType = (typeof SURFACE_TYPES)[number];

function toSurfaceType(value: string | null): SurfaceType | null {
  return SURFACE_TYPES.some((surface) => surface === value) ? (value as SurfaceType) : null;
}

export default async function AdminPlaygroundsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { supabase } = await requireAdmin();
  const t = await getTranslations("admin");

  const { data: rows } = await supabase
    .from("playgrounds")
    .select(
      "id, name, description, surface_type, is_fenced, has_shade, has_water, has_toilets, has_parking, flagged",
    )
    .order("created_at", { ascending: false });

  const items = rows ?? [];

  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/admin" className="link link-hover inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden />
        {t("title")}
      </Link>

      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("playgrounds.title")}</h1>
        <Link href="/add" className="btn btn-primary btn-sm gap-1">
          <Plus className="size-4" aria-hidden />
          {t("playgrounds.new")}
        </Link>
      </header>

      {items.length === 0 ? (
        <EmptyState variant="playgrounds" title={t("playgrounds.empty")} />
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{t("playgrounds.name")}</th>
                <th>{t("playgrounds.surface")}</th>
                <th>{t("playgrounds.flagged")}</th>
                <th>{t("playgrounds.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((pg) => (
                <tr key={pg.id}>
                  <td>
                    <Link href={`/playground/${pg.id}`} className="link link-hover">
                      {pg.name}
                    </Link>
                  </td>
                  <td className="text-sm">{pg.surface_type ?? "—"}</td>
                  <td>{pg.flagged ? "⚠️" : ""}</td>
                  <td>
                    <div className="flex gap-2">
                      <EditPlaygroundForm
                        playground={{
                          id: pg.id,
                          name: pg.name,
                          description: pg.description,
                          surface_type: toSurfaceType(pg.surface_type),
                          is_fenced: pg.is_fenced,
                          has_shade: pg.has_shade,
                          has_water: pg.has_water,
                          has_toilets: pg.has_toilets,
                          has_parking: pg.has_parking,
                        }}
                        locale={locale}
                        trigger={
                          <span className="btn btn-ghost btn-xs gap-1">
                            <Pencil className="size-3" aria-hidden />
                            {t("playgrounds.edit")}
                          </span>
                        }
                      />
                      <DeletePlaygroundButton id={pg.id} locale={locale} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
