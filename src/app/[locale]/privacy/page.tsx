import { getTranslations, setRequestLocale } from "next-intl/server";

// Public GDPR contact. Set NEXT_PUBLIC_PRIVACY_EMAIL to a dedicated, monitored address
// (ideally a .si domain) before broad launch. Falls back to the owner's address so the
// "right to object" contact is always a real, reachable inbox.
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? "ne.bevk@gmail.com";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");

  const dataItems = t.raw("dataCollected.items") as string[];
  const rightsItems = t.raw("rights.items") as string[];

  return (
    <article className="prose-slate mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-base-content/60">{t("lastUpdated")}</p>
      </header>

      <p className="text-base-content/80">{t("intro")}</p>

      <section>
        <h2 className="mb-2 text-xl font-semibold">{t("dataCollected.title")}</h2>
        <ul className="list-inside list-disc space-y-1 text-base-content/80">
          {dataItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">{t("processors.title")}</h2>
        <ul className="list-inside list-disc space-y-1 text-base-content/80">
          <li>{t("processors.supabase")}</li>
          <li>{t("processors.vercel")}</li>
          <li>{t("processors.vercelAnalytics")}</li>
          <li>{t("processors.cloudflare")}</li>
          <li>{t("processors.simpleAnalytics")}</li>
          <li>{t("processors.kofi")}</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">{t("location.title")}</h2>
        <p className="text-base-content/80">{t("location.body")}</p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">{t("retention.title")}</h2>
        <p className="text-base-content/80">{t("retention.body")}</p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">{t("rights.title")}</h2>
        <ul className="list-inside list-disc space-y-1 text-base-content/80">
          {rightsItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">{t("photos.title")}</h2>
        <p className="text-base-content/80">{t("photos.body")}</p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">{t("contact.title")}</h2>
        <p className="text-base-content/80">
          {t("contact.body", { email: CONTACT_EMAIL })}
        </p>
      </section>
    </article>
  );
}
