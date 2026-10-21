"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  EQUIPMENT_KEYS,
  PLAYGROUND_FEATURE_KEYS,
  SURFACE_TYPES,
  type EquipmentKey,
  type FeatureKey,
  type MapPlayground,
  type SurfaceType,
} from "@/lib/playground-types";
import { matchesFilters } from "@/lib/filters";

type FiltersState = {
  features: Set<FeatureKey>;
  surfaces: Set<SurfaceType>;
  equipment: Set<EquipmentKey>;
};

type FiltersContextValue = {
  state: FiltersState;
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleFeature: (key: FeatureKey) => void;
  toggleSurface: (key: SurfaceType) => void;
  toggleEquipment: (key: EquipmentKey) => void;
  clearAll: () => void;
  matches: (p: MapPlayground) => boolean;
  activeCount: number;
};

const FiltersContext = createContext<FiltersContextValue | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<Set<FeatureKey>>(() => new Set());
  const [surfaces, setSurfaces] = useState<Set<SurfaceType>>(() => new Set());
  const [equipment, setEquipment] = useState<Set<EquipmentKey>>(() => new Set());
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

  const toggleEquipment = useCallback((key: EquipmentKey) => {
    setEquipment((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setFeatures(new Set());
    setSurfaces(new Set());
    setEquipment(new Set());
  }, []);

  const value = useMemo<FiltersContextValue>(() => {
    const matches = (p: MapPlayground) => matchesFilters(p, features, surfaces, equipment);

    return {
      state: { features, surfaces, equipment },
      open,
      setOpen,
      toggleFeature,
      toggleSurface,
      toggleEquipment,
      clearAll,
      matches,
      activeCount: features.size + surfaces.size + equipment.size,
    };
  }, [features, surfaces, equipment, open, toggleFeature, toggleSurface, toggleEquipment, clearAll]);

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used inside <FiltersProvider>");
  return ctx;
}

export { EQUIPMENT_KEYS, PLAYGROUND_FEATURE_KEYS, SURFACE_TYPES };
