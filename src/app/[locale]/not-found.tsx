import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFoundPage() {
  const t = await getTranslations("common");

  return (
    <section className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-display text-6xl text-primary" aria-hidden>
        404
      </p>
      <h1 className="text-2xl font-bold">{t("notFoundTitle")}</h1>
      <p className="max-w-sm text-base-content/70">{t("notFoundBody")}</p>
      <Link href="/" className="btn btn-primary mt-2">
        {t("notFoundCta")}
      </Link>
    </section>
  );
}
