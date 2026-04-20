import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function SearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("search");

  return (
    <section className="p-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-base-content/70">{t("placeholder")}</p>
    </section>
  );
}
