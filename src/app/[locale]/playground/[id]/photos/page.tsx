import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MAX_PHOTOS } from "@/lib/photo-checks";
import { getPlaygroundById } from "@/lib/playgrounds";
import { createClient } from "@/lib/supabase/server";
import { AddPhotosForm } from "./AddPhotosForm";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Add photos to an existing playground (FR-ADD-06): any signed-in visitor with a confirmed email,
// up to 8 photos per playground each (the database enforces the same).
export default async function AddPhotosPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/playground/${id}/photos`)}`);

  const playground = await getPlaygroundById(id);
  if (!playground) notFound();

  const { count } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("playground_id", id)
    .eq("user_id", user.id);
  const t = await getTranslations("addPhotos");

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4 pt-6">
      <header>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-base-content/70">{playground.name}</p>
      </header>
      <AddPhotosForm
        playgroundId={id}
        locale={locale}
        verified={!!user.email_confirmed_at}
        remaining={Math.max(0, MAX_PHOTOS - (count ?? 0))}
      />
    </section>
  );
}
