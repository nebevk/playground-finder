import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import { approveFlaggedAction, deleteFlaggedAction } from "../actions";

type FlaggedItem = {
  target_type: "playground" | "review" | "photo";
  id: string;
  label: string;
  detail: string | null;
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

  const [pg, rev, ph] = await Promise.all([
    supabase.from("playgrounds").select("id, name, description").eq("flagged", true),
    supabase.from("reviews").select("id, comment, rating").eq("flagged", true),
    supabase.from("photos").select("id, storage_path, playground_id").eq("flagged", true),
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

  return (
    <section className="flex flex-col gap-4 p-4">
      <Link href="/admin" className="link link-hover inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden />
        {t("title")}
      </Link>
      <h1 className="text-2xl font-bold">{t("moderation.title")}</h1>

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
                    <p className="mt-1 text-sm text-base-content/70 break-all">
                      {item.detail}
                    </p>
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
  );
}
