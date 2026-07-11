import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandStack } from "@/components/Brand";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <section className="mx-auto max-w-sm p-4 pt-8">
      <div className="mb-8 flex justify-center md:hidden">
        <BrandStack size={140} align="center" nameSize="text-4xl" animatePunct />
      </div>
      <h1 className="mb-2 text-2xl font-bold">{t("forgotTitle")}</h1>
      <p className="mb-6 text-sm text-base-content/70">{t("forgotIntro")}</p>
      <ForgotPasswordForm locale={locale} />
    </section>
  );
}
