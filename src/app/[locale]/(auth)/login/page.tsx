import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <section className="mx-auto max-w-sm p-4 pt-8">
      <h1 className="mb-6 text-2xl font-bold">{t("loginTitle")}</h1>
      <LoginForm locale={locale} />
    </section>
  );
}
