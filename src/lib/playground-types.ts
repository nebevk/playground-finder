// The surfaces, features and equipment a playground can list. The database accepts only these
// (constraints playgrounds_surface_type_known and playgrounds_equipment_known, ops 0017; unit tests
// keep the lists equal): change both together. The order is the order everywhere they're shown.
export const SURFACE_TYPES = [
  "tartan",
  "rubber_tiles",
  "sand",
  "grass",
  "artificial_turf",
  "woodchips",
  "gravel",
  "asphalt",
] as const;
export type SurfaceType = (typeof SURFACE_TYPES)[number];

export function surfaceFrom(value: unknown): SurfaceType | null {
  return (SURFACE_TYPES as readonly unknown[]).includes(value) ? (value as SurfaceType) : null;
}

export const PLAYGROUND_FEATURE_KEYS = [
  "is_fenced",
  "has_shade",
  "has_water",
  "has_toilets",
  "has_parking",
  // Since ops 0017: null (unknown) for playgrounds nobody has answered them for.
  "has_benches",
  "has_toddler_area",
  "is_accessible",
  "has_lighting",
] as const;

export type FeatureKey = (typeof PLAYGROUND_FEATURE_KEYS)[number];

// The features ticked in a form (checkboxes named after the key). Unticked means "doesn't have it".
export function featuresFrom(formData: FormData): Record<FeatureKey, boolean> {
  return Object.fromEntries(PLAYGROUND_FEATURE_KEYS.map((k) => [k, formData.get(k) === "on"])) as Record<
    FeatureKey,
    boolean
  >;
}

// The features that can be unknown (null): those added in ops 0017. The first five never are.
const NULLABLE_FEATURE_KEYS = ["has_benches", "has_toddler_area", "is_accessible", "has_lighting"] as const satisfies readonly FeatureKey[];
type NullableFeatureKey = (typeof NULLABLE_FEATURE_KEYS)[number];

// Features from a source that only says what a playground has, such as an import: one it doesn't
// mention stays unknown where it can, rather than becoming "Brez …".
export function statedFeatures(
  has: (key: FeatureKey) => boolean,
): Record<Exclude<FeatureKey, NullableFeatureKey>, boolean> & Record<NullableFeatureKey, boolean | null> {
  const nullable: readonly FeatureKey[] = NULLABLE_FEATURE_KEYS;
  return Object.fromEntries(
    PLAYGROUND_FEATURE_KEYS.map((k) => [k, has(k) ? true : nullable.includes(k) ? null : false]),
  ) as Record<Exclude<FeatureKey, NullableFeatureKey>, boolean> & Record<NullableFeatureKey, boolean | null>;
}

// detail.equipmentOptions has the labels.
export const EQUIPMENT_KEYS = [
  "swings",
  "baby_swings",
  "nest_swing",
  "seesaw",
  "spring_riders",
  "slides",
  "climbing_wall",
  "climbing_net",
  "zipline",
  "merry_go_round",
  "trampoline",
  "sandbox",
  "playhouse",
  "water_play",
] as const;
export type EquipmentKey = (typeof EQUIPMENT_KEYS)[number];

export function isEquipmentKey(value: unknown): value is EquipmentKey {
  return (EQUIPMENT_KEYS as readonly unknown[]).includes(value);
}

// The equipment ticked in a form (checkboxes named "equipment"), known keys only, in list order.
export function equipmentFrom(formData: FormData): EquipmentKey[] {
  const ticked = new Set(formData.getAll("equipment").map(String));
  return EQUIPMENT_KEYS.filter((key) => ticked.has(key));
}

// Features as booleans: an unknown one (null in the database) counts as not having it.
export type MapPlayground = Record<FeatureKey, boolean> & {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
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
  /** Features nobody has answered yet (null): the page leaves them out instead of "Brez …". */
  unknownFeatures: FeatureKey[];
  /** Who added it. Server-side only: decides whether the visitor may edit it. */
  user_id: string | null;
};
