import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchClient } from "@/components/Search/SearchClient";
import { getMapSnapshot } from "@/lib/playgrounds";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  // A tool, not content: no need for search engines to list it.
  return { title: t("title"), robots: { index: false, follow: true } };
}

// Search by playground name or place (FR-MAP-10), over the same snapshot as the map.
export default async function SearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const packed = await getMapSnapshot();
  return <SearchClient packed={packed} />;
}
