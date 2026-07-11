import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

// Landing page for the password-recovery email link. The link goes through
// /auth/callback which exchanges the code for a session, then redirects here.
export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <section className="mx-auto max-w-sm p-4 pt-8">
      <h1 className="mb-6 text-2xl font-bold">{t("resetTitle")}</h1>
      {user ? (
        <ResetPasswordForm locale={locale} />
      ) : (
        <div className="flex flex-col gap-4">
          <div role="alert" className="alert alert-warning text-sm">
            {t("resetLinkInvalid")}
          </div>
          <Link href="/forgot-password" className="btn btn-primary">
            {t("forgotTitle")}
          </Link>
        </div>
      )}
    </section>
  );
}
