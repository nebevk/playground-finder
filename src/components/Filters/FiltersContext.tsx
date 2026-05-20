"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  PLAYGROUND_FEATURE_KEYS,
  SURFACE_TYPES,
  type FeatureKey,
  type MapPlayground,
  type SurfaceType,
} from "@/lib/playground-types";

type FiltersState = {
  features: Set<FeatureKey>;
  surfaces: Set<SurfaceType>;
};

type FiltersContextValue = {
  state: FiltersState;
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleFeature: (key: FeatureKey) => void;
  toggleSurface: (key: SurfaceType) => void;
  clearAll: () => void;
  matches: (p: MapPlayground) => boolean;
  activeCount: number;
};

const FiltersContext = createContext<FiltersContextValue | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<Set<FeatureKey>>(() => new Set());
  const [surfaces, setSurfaces] = useState<Set<SurfaceType>>(() => new Set());
  const [open, setOpen] = useState(false);

  const toggleFeature = useCallback((key: FeatureKey) => {
    setFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleSurface = useCallback((key: SurfaceType) => {
    setSurfaces((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setFeatures(new Set());
    setSurfaces(new Set());
  }, []);

  const value = useMemo<FiltersContextValue>(() => {
    const matches = (p: MapPlayground) => {
      for (const f of features) if (!p[f]) return false;
      if (surfaces.size > 0 && (!p.surface_type || !surfaces.has(p.surface_type))) return false;
      return true;
    };

    return {
      state: { features, surfaces },
      open,
      setOpen,
      toggleFeature,
      toggleSurface,
      clearAll,
      matches,
      activeCount: features.size + surfaces.size,
    };
  }, [features, surfaces, open, toggleFeature, toggleSurface, clearAll]);

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used inside <FiltersProvider>");
  return ctx;
}

export { PLAYGROUND_FEATURE_KEYS, SURFACE_TYPES };
