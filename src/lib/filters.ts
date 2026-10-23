import type { EquipmentKey, FeatureKey, MapPlayground, SurfaceType } from "./playground-types";

// A playground matches when it has every selected feature and every selected piece of equipment
// (AND) and, if any surfaces are selected, one of those surfaces (OR).
export function matchesFilters(
  p: Pick<MapPlayground, FeatureKey | "surfaces" | "equipment">,
  features: ReadonlySet<FeatureKey>,
  surfaces: ReadonlySet<SurfaceType>,
  equipment: ReadonlySet<EquipmentKey> = new Set(),
): boolean {
  for (const f of features) if (!p[f]) return false;
  for (const e of equipment) if (!p.equipment.includes(e)) return false;
  if (surfaces.size > 0 && !p.surfaces.some((s) => surfaces.has(s))) return false;
  return true;
}
