import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPlaygroundById } from "@/lib/playgrounds";
import { PLAYGROUND_FEATURE_KEYS, type FeatureKey } from "@/lib/playground-types";
import { createClient } from "@/lib/supabase/server";
import { EditPlaygroundForm } from "./EditPlaygroundForm";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Only the person who added the playground can edit it (FR-ADD-08). The database enforces the
// same rule when saving; this page just doesn't offer the form to anyone else.
export default async function EditPlaygroundPage({
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
  if (!user) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/playground/${id}/edit`)}`);

  const playground = await getPlaygroundById(id);
  if (!playground || playground.user_id !== user.id) notFound();

  const t = await getTranslations("edit");
  const features = Object.fromEntries(PLAYGROUND_FEATURE_KEYS.map((k) => [k, playground[k]])) as Record<
    FeatureKey,
    boolean
  >;

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4 pt-6">
      <header>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-base-content/70">{t("intro")}</p>
      </header>
      <EditPlaygroundForm
        locale={locale}
        playground={{
          id: playground.id,
          name: playground.name,
          description: playground.description ?? "",
          surface: playground.surface_type ?? "",
          lat: playground.lat,
          lng: playground.lng,
          features,
          equipment: playground.equipment,
        }}
      />
    </section>
  );
}
