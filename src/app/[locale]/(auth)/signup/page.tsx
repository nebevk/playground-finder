import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandStack } from "@/components/Brand";
import { safeNextPath } from "@/lib/site";
import { SignupForm } from "./SignupForm";

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  const { next } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <section className="mx-auto max-w-sm p-4 pt-8">
      <div className="mb-6 flex justify-center md:hidden">
        <BrandStack size={96} align="center" nameSize="text-3xl" animatePunct />
      </div>
      <h1 className="mb-6 text-2xl font-bold">{t("signupTitle")}</h1>
      <SignupForm locale={locale} next={safeNextPath(next, "") || undefined} />
    </section>
  );
}
