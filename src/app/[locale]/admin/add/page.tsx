import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import { QuickAddForm } from "./QuickAddForm";

export default async function AdminQuickAddPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin");

  return (
    <section className="flex flex-col gap-4 p-4">
      <Link
        href="/admin/playgrounds"
        className="link link-hover inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("playgrounds.title")}
      </Link>
      <h1 className="text-2xl font-bold">{t("quickAdd.title")}</h1>
      <QuickAddForm locale={locale} />
    </section>
  );
}
