import { getTranslations } from "next-intl/server";
import { LoadingState } from "@/components/Loader";

// The map's own loading screen (the design kit's pin). There is no app-wide one: it streamed every
// page before notFound() could set a 404 (BL-44).
export default async function MapLoading() {
  const t = await getTranslations("map");
  return (
    <div className="h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] w-full md:h-dvh">
      <LoadingState variant="pin" label={t("loading")} />
    </div>
  );
}
