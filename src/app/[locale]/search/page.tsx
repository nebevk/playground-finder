import { redirect } from "@/i18n/navigation";

// Search isn't built yet and is no longer in the nav. Anyone landing here from an old
// link or bookmark is sent to the map (where discovery currently lives).
export default async function SearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/", locale });
}
