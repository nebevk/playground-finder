export type SurfaceType = "tartan" | "sand" | "grass" | "gravel";
export const SURFACE_TYPES: readonly SurfaceType[] = ["tartan", "sand", "grass", "gravel"];

export const PLAYGROUND_FEATURE_KEYS = [
  "is_fenced",
  "has_shade",
  "has_water",
  "has_toilets",
  "has_parking",
] as const;

export type FeatureKey = (typeof PLAYGROUND_FEATURE_KEYS)[number];

// Equipment a playground can list (detail.equipmentOptions has the labels). The database accepts
// only these (constraint playgrounds_equipment_known, ops 0014): change both together.
export const EQUIPMENT_KEYS = ["swings", "slides", "zipline", "sandbox", "climbing_wall"] as const;
export type EquipmentKey = (typeof EQUIPMENT_KEYS)[number];

export function isEquipmentKey(value: unknown): value is EquipmentKey {
  return (EQUIPMENT_KEYS as readonly unknown[]).includes(value);
}

// The equipment ticked in a form (checkboxes named "equipment"), known keys only, in list order.
export function equipmentFrom(formData: FormData): EquipmentKey[] {
  const ticked = new Set(formData.getAll("equipment").map(String));
  return EQUIPMENT_KEYS.filter((key) => ticked.has(key));
}

export type MapPlayground = {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  is_fenced: boolean;
  has_shade: boolean;
  has_water: boolean;
  has_toilets: boolean;
  has_parking: boolean;
  surface_type: SurfaceType | null;
  review_count: number;
  avg_rating: number | null;
  equipment: EquipmentKey[];
};

export type PlaygroundPhoto = {
  id: string;
  url: string;
};

export type PlaygroundDetail = MapPlayground & {
  photos: PlaygroundPhoto[];
  /** Who added it. Server-side only: decides whether the visitor may edit it. */
  user_id: string | null;
};
