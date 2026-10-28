import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeAlternates } from "@/lib/seo";
import { getPrivacyEmail } from "@/lib/site";

const SECTIONS = ["content", "conduct", "moderation", "liability", "changes"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });
  return { title: t("title"), description: t("intro"), alternates: localeAlternates(locale, "/terms") };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("terms");

  return (
    <article className="prose-slate mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-base-content/60">{t("lastUpdated")}</p>
      </header>

      <p className="text-base-content/80">{t("intro")}</p>

      {SECTIONS.map((section) => (
        <section key={section}>
          <h2 className="mb-2 text-xl font-semibold">{t(`${section}.title`)}</h2>
          <p className="text-base-content/80">{t(`${section}.body`)}</p>
        </section>
      ))}

      <section>
        <h2 className="mb-2 text-xl font-semibold">{t("contact.title")}</h2>
        <p className="text-base-content/80">{t("contact.body", { email: getPrivacyEmail() })}</p>
      </section>
    </article>
  );
}
