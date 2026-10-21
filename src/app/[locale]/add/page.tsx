import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getMapSnapshot } from "@/lib/playgrounds";
import { createClient } from "@/lib/supabase/server";
import { AddFlow } from "./AddFlow";

export default async function AddPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("add");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <section className="p-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-base-content/70">{t("loginPrompt")}</p>
        <Link href={{ pathname: "/login", query: { next: `/${locale}/add` } }} className="btn btn-primary mt-4">
          {t("loginCta")}
        </Link>
      </section>
    );
  }

  // Existing playgrounds, shown faded on the picker to prevent duplicates (BL-60).
  const existing = (await getMapSnapshot()).map(([id, name, lat, lng]) => ({ id, name, lat, lng }));
  return <AddFlow locale={locale} emailVerified={!!user.email_confirmed_at} existing={existing} />;
}
