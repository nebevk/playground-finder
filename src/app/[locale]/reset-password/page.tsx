import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { NOT_LISTED } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("resetTitle"), robots: NOT_LISTED };
}

// Landing page for the password-recovery email link: /reset-password?token_hash=…&type=recovery
// (supabase/templates/recovery.html). The token is NOT verified here: a GET can come from an
// email scanner, which would use it up. It's verified when the form is submitted.
// A signed-in user without a token (e.g. via an old /auth/callback link) can also set a password.
export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { locale } = await params;
  const { token_hash, type } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  const tokenHash = type === "recovery" && token_hash ? token_hash : null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <section className="mx-auto max-w-sm p-4 pt-8">
      <h1 className="mb-6 text-2xl font-bold">{t("resetTitle")}</h1>
      {tokenHash || user ? (
        <ResetPasswordForm locale={locale} tokenHash={tokenHash} />
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
