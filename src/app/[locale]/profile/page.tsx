import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Shield } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "../(auth)/actions";
import { BrandStack } from "@/components/Brand";
import { ExportDataButton } from "@/components/Profile/ExportDataButton";
import { DeleteAccountButton } from "@/components/Profile/DeleteAccountButton";
import { MyContributions } from "@/components/Profile/MyContributions";
import { MyFavorites } from "@/components/Profile/MyFavorites";
import { ResendVerificationButton } from "@/components/Profile/ResendVerificationButton";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { NOT_LISTED } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "profile" });
  return { title: t("title"), robots: NOT_LISTED };
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const { locale } = await params;
  const { confirmed } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("profile");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <section className="flex flex-col items-center gap-6 p-4 pt-8 text-center">
        {/* Desktop already shows the brand in the side nav. */}
        <div className="md:hidden">
          <BrandStack size={96} align="center" nameSize="text-3xl" animatePunct />
        </div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-base-content/70">{t("loggedOut")}</p>
        <div className="flex gap-3">
          <Link href="/login" className="btn btn-primary">
            {t("loginCta")}
          </Link>
          <Link href="/signup" className="btn btn-ghost">
            {t("signupCta")}
          </Link>
        </div>
        <div className="md:hidden">
          <LocaleSwitcher />
        </div>
      </section>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, is_admin")
    .eq("id", user.id)
    .single();

  return (
    <section className="flex flex-col gap-8 p-4">
      <header>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-base-content/70">
          {t("loggedInAs", { email: user.email ?? "" })}
        </p>
        {profile?.username && (
          <p className="mt-1 text-sm text-base-content/60">
            {t("username")}: <span className="font-semibold text-base-content">{profile.username}</span>
          </p>
        )}
      </header>

      {confirmed === "1" && user.email_confirmed_at && (
        <div role="status" className="alert alert-success text-sm">
          {t("emailConfirmed")}
        </div>
      )}

      {!user.email_confirmed_at && (
        <div role="alert" className="alert alert-warning items-start text-sm">
          <div className="flex flex-col gap-2">
            <p>{t("verifyBanner")}</p>
            <ResendVerificationButton locale={locale} />
          </div>
        </div>
      )}

      {profile?.is_admin && (
        <Link href="/admin" className="btn btn-primary gap-2 self-start">
          <Shield className="size-4" aria-hidden />
          {t("adminLink")}
        </Link>
      )}

      <MyFavorites userId={user.id} />

      <MyContributions userId={user.id} />

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("data")}</h2>
        <ExportDataButton />
      </section>

      <section className="md:hidden">
        <h2 className="mb-3 text-lg font-semibold">{t("language")}</h2>
        <LocaleSwitcher />
      </section>

      <form action={logoutAction}>
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" className="btn btn-outline">
          {t("logout")}
        </button>
      </form>

      {/* Destructive action last, set apart from everyday ones (design critique). */}
      <section className="border-t border-base-300 pt-6">
        <DeleteAccountButton locale={locale} />
      </section>
    </section>
  );
}
