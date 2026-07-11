import { getTranslations, setRequestLocale } from "next-intl/server";

// Same monitored inbox as the privacy page.
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? "ne.bevk@gmail.com";

const SECTIONS = ["content", "conduct", "moderation", "liability", "changes"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });
  return { title: t("title") };
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
        <h1 className="text-3xl font-bold">{t("title")}</h1>
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
        <p className="text-base-content/80">{t("contact.body", { email: CONTACT_EMAIL })}</p>
      </section>
    </article>
  );
}
