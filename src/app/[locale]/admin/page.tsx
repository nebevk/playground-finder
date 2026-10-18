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
      <Link href="/profile" className="btn btn-ghost -ml-4 gap-1 self-start">
        <ArrowLeft className="size-5" aria-hidden />
        {t("backToSite")}
      </Link>

      <header>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-base-content/70">{t("dashboardIntro")}</p>
      </header>

      {/* Each count links to the queue that resolves it; non-zero counts stand out (BL-67). */}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <li key={s.key}>
            <Link
              href="/admin/moderation"
              className={`flex h-full flex-col gap-1 rounded-box border-2 p-4 transition-colors hover:bg-base-200 ${
                s.value > 0 ? "border-warning bg-warning/5" : "border-base-300"
              }`}
            >
              <span className="text-sm text-base-content/70">{t(`counts.${s.key}`)}</span>
              <span className={`text-2xl font-bold ${s.value > 0 ? "text-warning" : ""}`}>{s.value}</span>
            </Link>
          </li>
        ))}
      </ul>

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
