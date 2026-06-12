import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, MapPinned, ShieldAlert, Plus, ClipboardCheck, Upload } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { supabase } = await requireAdmin();
  const t = await getTranslations("admin");

  const [flaggedPlaygrounds, flaggedReviews, flaggedPhotos, openReports] = await Promise.all([
    supabase.from("playgrounds").select("id", { count: "exact", head: true }).eq("flagged", true),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("flagged", true),
    supabase.from("photos").select("id", { count: "exact", head: true }).eq("flagged", true),
    supabase.from("reports").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { key: "flaggedPlaygrounds", value: flaggedPlaygrounds.count ?? 0 },
    { key: "flaggedReviews", value: flaggedReviews.count ?? 0 },
    { key: "flaggedPhotos", value: flaggedPhotos.count ?? 0 },
    { key: "openReports", value: openReports.count ?? 0 },
  ] as const;

  return (
    <section className="flex flex-col gap-6 p-4">
      <Link href="/profile" className="link link-hover inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToSite")}
      </Link>

      <header>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-base-content/70">{t("dashboardIntro")}</p>
      </header>

      <div className="stats stats-vertical md:stats-horizontal shadow">
        {stats.map((s) => (
          <div key={s.key} className="stat">
            <div className="stat-title text-xs">{t(`counts.${s.key}`)}</div>
            <div className="stat-value text-2xl">{s.value}</div>
          </div>
        ))}
      </div>

      <nav className="grid gap-3 md:grid-cols-2">
        <Link href="/admin/playgrounds" className="btn btn-outline gap-2 justify-start">
          <MapPinned className="size-5" aria-hidden />
          {t("links.playgrounds")}
        </Link>
        <Link href="/admin/add" className="btn btn-outline gap-2 justify-start">
          <Plus className="size-5" aria-hidden />
          {t("links.quickAdd")}
        </Link>
        <Link href="/admin/import" className="btn btn-outline gap-2 justify-start">
          <Upload className="size-5" aria-hidden />
          {t("links.import")}
        </Link>
        <Link href="/admin/quality" className="btn btn-outline gap-2 justify-start">
          <ClipboardCheck className="size-5" aria-hidden />
          {t("links.quality")}
        </Link>
        <Link href="/admin/moderation" className="btn btn-outline gap-2 justify-start">
          <ShieldAlert className="size-5" aria-hidden />
          {t("links.moderation")}
        </Link>
      </nav>
    </section>
  );
}
