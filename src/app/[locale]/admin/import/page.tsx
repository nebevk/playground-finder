import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import { ImportClient } from "./ImportClient";

export default async function AdminImportPage({
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
      <h1 className="text-2xl font-bold">{t("import.title")}</h1>
      <ImportClient locale={locale} />
    </section>
  );
}
