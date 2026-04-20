"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

const LocationPicker = dynamic(
  () => import("./LocationPicker").then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => <Loading />,
  },
);

function Loading() {
  const t = useTranslations("map");
  return (
    <div className="flex h-full w-full items-center justify-center bg-base-200">
      <span className="loading loading-spinner loading-lg text-primary" aria-label={t("loading")} />
    </div>
  );
}

type LatLng = { lat: number; lng: number };

export function LocationPickerClient(props: {
  value: LatLng | null;
  onChange: (pos: LatLng) => void;
}) {
  return <LocationPicker {...props} />;
}
