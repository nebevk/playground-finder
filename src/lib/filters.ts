import type { FeatureKey, MapPlayground, SurfaceType } from "./playground-types";

// A playground matches when it has every selected feature (AND) and, if any
// surfaces are selected, one of those surfaces (OR).
export function matchesFilters(
  p: Pick<MapPlayground, FeatureKey | "surface_type">,
  features: ReadonlySet<FeatureKey>,
  surfaces: ReadonlySet<SurfaceType>,
): boolean {
  for (const f of features) if (!p[f]) return false;
  if (surfaces.size > 0 && (!p.surface_type || !surfaces.has(p.surface_type))) return false;
  return true;
}
