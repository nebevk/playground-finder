import { getTranslations, setRequestLocale } from "next-intl/server";
import { Shield } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "../(auth)/actions";
import { BrandStack } from "@/components/Brand";
import { ExportDataButton } from "@/components/Profile/ExportDataButton";
import { DeleteAccountButton } from "@/components/Profile/DeleteAccountButton";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <section className="flex flex-col items-center gap-6 p-4 pt-8 text-center">
        <BrandStack size={140} align="center" nameSize="text-4xl" animatePunct />
        <p className="text-base-content/70">{t("loggedOut")}</p>
        <div className="flex gap-3">
          <Link href="/login" className="btn btn-primary">
            {t("loginCta")}
          </Link>
          <Link href="/signup" className="btn btn-ghost">
            {t("signupCta")}
          </Link>
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
            {t("username")}: <span className="font-mono">{profile.username}</span>
          </p>
        )}
      </header>

      {profile?.is_admin && (
        <Link href="/admin" className="btn btn-primary gap-2 self-start">
          <Shield className="size-4" aria-hidden />
          {t("adminLink")}
        </Link>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("data")}</h2>
        <div className="flex flex-wrap gap-3">
          <ExportDataButton />
          <DeleteAccountButton locale={locale} />
        </div>
      </section>

      <form action={logoutAction}>
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" className="btn btn-outline">
          {t("logout")}
        </button>
      </form>
    </section>
  );
}
