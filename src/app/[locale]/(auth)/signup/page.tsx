import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandStack } from "@/components/Brand";
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
      <div className="mb-8 flex justify-center md:hidden">
        <BrandStack size={56} align="center" />
      </div>
      <h1 className="mb-6 text-2xl font-bold">{t("signupTitle")}</h1>
      <SignupForm locale={locale} />
    </section>
  );
}
