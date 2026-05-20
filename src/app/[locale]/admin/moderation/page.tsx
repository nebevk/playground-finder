import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import {
  approveFlaggedAction,
  deleteFlaggedAction,
  dismissReportAction,
  flagTargetAction,
} from "../actions";

type FlaggedItem = {
  target_type: "playground" | "review" | "photo";
  id: string;
  label: string;
  detail: string | null;
};

type ReportRow = {
  id: string;
  target_type: "playground" | "review" | "photo";
  target_id: string;
  reason: string;
  created_at: string;
  reporter: string;
};

export default async function ModerationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { supabase } = await requireAdmin();
  const t = await getTranslations("admin");

  const [pg, rev, ph, reportsRes] = await Promise.all([
    supabase.from("playgrounds").select("id, name, description").eq("flagged", true),
    supabase.from("reviews").select("id, comment, rating").eq("flagged", true),
    supabase.from("photos").select("id, storage_path, playground_id").eq("flagged", true),
    supabase
      .from("reports")
      .select("id, target_type, target_id, reason, created_at, profiles!inner(username)")
      .order("created_at", { ascending: false }),
  ]);

  const items: FlaggedItem[] = [
    ...(pg.data ?? []).map((r) => ({
      target_type: "playground" as const,
      id: r.id,
      label: r.name,
      detail: r.description,
    })),
    ...(rev.data ?? []).map((r) => ({
      target_type: "review" as const,
      id: r.id,
      label: `${r.rating}★`,
      detail: r.comment,
    })),
    ...(ph.data ?? []).map((r) => ({
      target_type: "photo" as const,
      id: r.id,
      label: r.storage_path,
      detail: `playground ${r.playground_id}`,
    })),
  ];

  const reports: ReportRow[] = (reportsRes.data ?? []).map((r) => {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id,
      target_type: r.target_type as ReportRow["target_type"],
      target_id: r.target_id,
      reason: r.reason,
      created_at: r.created_at,
      reporter: profile?.username ?? "",
    };
  });

  return (
    <section className="flex flex-col gap-6 p-4">
      <Link href="/admin" className="link link-hover inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden />
        {t("title")}
      </Link>
      <h1 className="text-2xl font-bold">{t("moderation.title")}</h1>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("moderation.flaggedHeading")}</h2>
        {items.length === 0 ? (
          <p className="text-sm text-base-content/60">{t("moderation.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li
                key={`${item.target_type}-${item.id}`}
                className="rounded-box border border-base-300 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase text-base-content/50">
                      {t(`moderation.type.${item.target_type}`)}
                    </p>
                    <p className="font-semibold">{item.label}</p>
                    {item.detail && (
                      <p className="mt-1 text-sm text-base-content/70 break-all">{item.detail}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <form action={approveFlaggedAction}>
                      <input type="hidden" name="target" value={item.target_type} />
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button type="submit" className="btn btn-success btn-sm">
                        {t("moderation.approve")}
                      </button>
                    </form>
                    <form action={deleteFlaggedAction}>
                      <input type="hidden" name="target" value={item.target_type} />
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button type="submit" className="btn btn-error btn-sm">
                        {t("moderation.delete")}
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">{t("moderation.reportsHeading")}</h2>
        <p className="mb-3 text-xs text-base-content/60">{t("moderation.reportsHelp")}</p>
        {reports.length === 0 ? (
          <p className="text-sm text-base-content/60">{t("moderation.reportsEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-box border border-base-300 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase text-base-content/50">
                      {t(`moderation.type.${r.target_type}`)} ·{" "}
                      {t(`moderation.reportReasons.${r.reason}`)}
                    </p>
                    <p className="mt-1 font-mono text-xs break-all">{r.target_id}</p>
                    <p className="mt-1 text-xs text-base-content/60">
                      {t("moderation.reportedBy")}: <span className="font-mono">{r.reporter}</span>
                    </p>
                    {r.target_type === "playground" && (
                      <Link
                        href={`/playground/${r.target_id}`}
                        className="link link-primary mt-1 text-xs"
                      >
                        →
                      </Link>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <form action={dismissReportAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button type="submit" className="btn btn-ghost btn-sm">
                        {t("moderation.dismiss")}
                      </button>
                    </form>
                    <form action={flagTargetAction}>
                      <input type="hidden" name="target" value={r.target_type} />
                      <input type="hidden" name="id" value={r.target_id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button type="submit" className="btn btn-warning btn-sm">
                        {t("moderation.flagNow")}
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
