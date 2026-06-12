"use client";

import dynamic from "next/dynamic";
import type { PreviewPoint } from "./MapPreview";

const MapPreview = dynamic(() => import("./MapPreview").then((m) => m.MapPreview), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-base-200" />,
});

export function MapPreviewClient({ points }: { points: PreviewPoint[] }) {
  return <MapPreview points={points} />;
}
