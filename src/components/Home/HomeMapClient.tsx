"use client";

import dynamic from "next/dynamic";
import type { HomeMapProps } from "./HomeMap";

// Leaflet needs `window`. Nothing while it loads: the box behind is already map-land coloured.
const HomeMap = dynamic(() => import("./HomeMap").then((m) => m.HomeMap), {
  ssr: false,
  loading: () => null,
});

export function HomeMapClient(props: HomeMapProps) {
  return <HomeMap {...props} />;
}
