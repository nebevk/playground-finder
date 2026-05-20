"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { LoadingSwing } from "@/components/LoadingSwing";

const LocationPicker = dynamic(
  () => import("./LocationPicker").then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => <Loading />,
  },
);

function Loading() {
  const t = useTranslations("map");
  return <LoadingSwing label={t("loading")} />;
}

type LatLng = { lat: number; lng: number };

export function LocationPickerClient(props: {
  value: LatLng | null;
  onChange: (pos: LatLng) => void;
}) {
  return <LocationPicker {...props} />;
}
