import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandStack } from "@/components/Brand";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <section className="mx-auto max-w-sm p-4 pt-8">
      <div className="mb-8 flex justify-center md:hidden">
        <BrandStack size={140} align="center" nameSize="text-4xl" animatePunct />
      </div>
      <h1 className="mb-6 text-2xl font-bold">{t("loginTitle")}</h1>
      {error === "link_invalid" && (
        <div role="alert" className="alert alert-warning mb-4 text-sm">
          {t("linkInvalid")}
        </div>
      )}
      <LoginForm locale={locale} />
    </section>
  );
}
