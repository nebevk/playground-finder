import { getTranslations, setRequestLocale } from "next-intl/server";
import { SignupForm } from "./SignupForm";

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <section className="mx-auto max-w-sm p-4 pt-8">
      <h1 className="mb-6 text-2xl font-bold">{t("signupTitle")}</h1>
      <SignupForm locale={locale} />
    </section>
  );
}
