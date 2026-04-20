import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "../(auth)/actions";

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
      <section className="p-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-base-content/70">{t("loggedOut")}</p>
        <div className="mt-4 flex gap-3">
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
    .select("username")
    .eq("id", user.id)
    .single();

  return (
    <section className="p-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-base-content/70">
        {t("loggedInAs", { email: user.email ?? "" })}
      </p>
      {profile?.username && (
        <p className="mt-1 text-sm text-base-content/60">
          {t("username")}: <span className="font-mono">{profile.username}</span>
        </p>
      )}

      <form action={logoutAction} className="mt-6">
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" className="btn btn-outline">
          {t("logout")}
        </button>
      </form>
    </section>
  );
}
