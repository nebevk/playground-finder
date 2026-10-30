import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, MapPinned, ShieldAlert, Plus, ClipboardCheck, Upload, Inbox } from "lucide-react";
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

  const [pendingPlaygrounds, flaggedPlaygrounds, flaggedReviews, flaggedPhotos, openReports] = await Promise.all([
    supabase.from("playgrounds").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("playgrounds").select("id", { count: "exact", head: true }).eq("flagged", true),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("flagged", true),
    supabase.from("photos").select("id", { count: "exact", head: true }).eq("flagged", true),
    supabase.from("reports").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { key: "pendingPlaygrounds", value: pendingPlaygrounds.count ?? 0, href: "/admin/pending" },
    { key: "flaggedPlaygrounds", value: flaggedPlaygrounds.count ?? 0, href: "/admin/moderation" },
    { key: "flaggedReviews", value: flaggedReviews.count ?? 0, href: "/admin/moderation" },
    { key: "flaggedPhotos", value: flaggedPhotos.count ?? 0, href: "/admin/moderation" },
    { key: "openReports", value: openReports.count ?? 0, href: "/admin/moderation" },
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

      {/* Each count links to the queue that resolves it; a non-zero count stands out by its
          colour, not by a coloured border (BL-67). New playgrounds to review come first, the full
          width on a phone. */}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <li key={s.key} className={s.key === "pendingPlaygrounds" ? "col-span-2 md:col-span-1" : undefined}>
            <Link
              href={s.href}
              className="flex h-full flex-col gap-1 rounded-box border border-base-300 p-4 transition-colors hover:bg-base-200"
            >
              <span className="text-sm text-base-content/70">{t(`counts.${s.key}`)}</span>
              <span className={`text-2xl font-bold ${s.value > 0 ? "text-warning" : ""}`}>{s.value}</span>
            </Link>
          </li>
        ))}
      </ul>

      <nav className="grid gap-3 md:grid-cols-2">
        <Link href="/admin/pending" className="btn btn-outline gap-2 justify-start">
          <Inbox className="size-5" aria-hidden />
          {t("links.pending")}
        </Link>
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
