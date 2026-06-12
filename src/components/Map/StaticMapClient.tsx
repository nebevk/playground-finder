"use client";

import dynamic from "next/dynamic";

const StaticMap = dynamic(() => import("./StaticMap").then((m) => m.StaticMap), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-base-200" />,
});

export function StaticMapClient(props: {
  lat: number;
  lng: number;
  zoom?: number;
  marker?: boolean;
}) {
  return <StaticMap {...props} />;
}
