"use client";

import { useSyncExternalStore } from "react";

// `null` during SSR and hydration (no window), then the live match. Lets a page mount only the
// Leaflet map that is actually visible, instead of a hidden second copy.
export function useMediaQuery(query: string): boolean | null {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => null,
  );
}
