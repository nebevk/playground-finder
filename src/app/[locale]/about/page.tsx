import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Coffee, ExternalLink } from "lucide-react";
import { KOFI_URL, PERSONAL_URL } from "@/lib/links";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("title") };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <article className="prose-slate mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
      </header>

      <p className="text-base-content/80">{t("intro")}</p>
      <p className="text-base-content/80">{t("what")}</p>

      <section>
        <h2 className="mb-2 text-xl font-semibold">{t("authorTitle")}</h2>
        <p className="text-base-content/80">{t("authorBody")}</p>
        <a
          href={PERSONAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="link link-primary mt-2 inline-flex items-center gap-1"
        >
          {t("authorLink")}
          <ExternalLink className="size-4" aria-hidden />
        </a>
      </section>

      <section className="rounded-box bg-base-200/60 p-5">
        <h2 className="mb-2 text-xl font-semibold">{t("supportTitle")}</h2>
        <p className="text-base-content/80">{t("supportBody")}</p>
        <a
          href={KOFI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary mt-3 gap-2"
        >
          <Coffee className="size-5" aria-hidden />
          {t("supportCta")}
        </a>
      </section>
    </article>
  );
}
