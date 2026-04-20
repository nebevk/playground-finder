"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { MapPlayground } from "@/lib/playgrounds";

const PlaygroundMap = dynamic(
  () => import("./PlaygroundMap").then((m) => m.PlaygroundMap),
  {
    ssr: false,
    loading: () => <MapLoading />,
  },
);

function MapLoading() {
  const t = useTranslations("map");
  return (
    <div className="flex h-full w-full items-center justify-center bg-base-200">
      <span className="loading loading-spinner loading-lg text-primary" aria-label={t("loading")} />
    </div>
  );
}

export function MapClient({ playgrounds }: { playgrounds: MapPlayground[] }) {
  return <PlaygroundMap playgrounds={playgrounds} />;
}
