"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { LoadingState } from "@/components/Loader";

const LocationPicker = dynamic(
  () => import("./LocationPicker").then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => <Loading />,
  },
);

function Loading() {
  const t = useTranslations("map");
  return <LoadingState variant="pin" label={t("loading")} />;
}

type LatLng = { lat: number; lng: number };

export function LocationPickerClient(props: {
  value: LatLng | null;
  onChange: (pos: LatLng) => void;
  existing?: { id: string; name: string; lat: number; lng: number }[];
}) {
  return <LocationPicker {...props} />;
}
