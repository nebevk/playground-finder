import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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
        <Link href="/login" className="btn btn-primary mt-4">
          {t("loginCta")}
        </Link>
      </section>
    );
  }

  return <AddFlow locale={locale} emailVerified={!!user.email_confirmed_at} />;
}
