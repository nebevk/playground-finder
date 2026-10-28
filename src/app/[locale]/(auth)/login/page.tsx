import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandStack } from "@/components/Brand";
import { safeNextPath } from "@/lib/site";
import { LoginForm } from "./LoginForm";
import { NOT_LISTED } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("loginTitle"), robots: NOT_LISTED };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { locale } = await params;
  const { error, next } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <section className="mx-auto max-w-sm p-4 pt-8">
      <div className="mb-6 flex justify-center md:hidden">
        <BrandStack size={96} align="center" nameSize="text-3xl" animatePunct />
      </div>
      <h1 className="mb-6 text-2xl font-bold">{t("loginTitle")}</h1>
      {error === "link_invalid" && (
        <div role="alert" className="alert alert-warning mb-4 text-sm">
          {t("linkInvalid")}
        </div>
      )}
      <LoginForm locale={locale} next={safeNextPath(next, "") || undefined} />
    </section>
  );
}
