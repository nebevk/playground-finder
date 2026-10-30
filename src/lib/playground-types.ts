// The surfaces, features and equipment a playground can list. The database accepts only these
// (constraints playgrounds_surfaces_known and playgrounds_equipment_known, ops 0017; unit tests keep
// the lists equal): change both together. The order is the order everywhere they're shown.
export const SURFACE_TYPES = [
  "rubber_tiles",
  "sand",
  "grass",
  "artificial_turf",
  "woodchips",
  "gravel",
  "asphalt",
] as const;
export type SurfaceType = (typeof SURFACE_TYPES)[number];

// Known surfaces only, once each, in list order. "tartan" was an option of its own before ops 0017;
// it's the same as rubber tiles, so older data and imports that say it still count.
export function surfacesIn(values: Iterable<unknown>): SurfaceType[] {
  const given = new Set(Array.from(values, (v) => (v === "tartan" ? "rubber_tiles" : v)));
  return SURFACE_TYPES.filter((s) => given.has(s));
}

// The surfaces ticked in a form (checkboxes named "surfaces").
export function surfacesFrom(formData: FormData): SurfaceType[] {
  return surfacesIn(formData.getAll("surfaces"));
}

export const PLAYGROUND_FEATURE_KEYS = [
  "is_fenced",
  "has_shade",
  "has_water",
  "has_toilets",
  "has_parking",
  "has_benches",
  "has_toddler_area",
  "is_accessible",
  "has_lighting",
] as const;

export type FeatureKey = (typeof PLAYGROUND_FEATURE_KEYS)[number];

// The features ticked in a form (checkboxes named after the key). Unticked means "doesn't have it"
// (shown as "Brez …"). Forms always answer every feature.
export function featuresFrom(formData: FormData): Record<FeatureKey, boolean> {
  return Object.fromEntries(PLAYGROUND_FEATURE_KEYS.map((k) => [k, formData.get(k) === "on"])) as Record<
    FeatureKey,
    boolean
  >;
}

// Features from a source that only says what a playground has, such as an import: one it doesn't
// mention stays unknown (null), rather than becoming "Brez …".
export function statedFeatures(has: (key: FeatureKey) => boolean): Record<FeatureKey, boolean | null> {
  return Object.fromEntries(PLAYGROUND_FEATURE_KEYS.map((k) => [k, has(k) ? true : null])) as Record<
    FeatureKey,
    boolean | null
  >;
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

// Whether a playground is public (ADR-0003). Only "published" ones show anywhere outside admin;
// discovery adds "pending" ones, and an admin publishes or rejects them. The database accepts only
// these (constraint playgrounds_status_known, ops 0020; a unit test keeps the lists equal).
export const PLAYGROUND_STATUSES = ["pending", "published", "rejected"] as const;
export type PlaygroundStatus = (typeof PLAYGROUND_STATUSES)[number];

// Where a playground came from (constraint playgrounds_source_known). Rows added before ops 0020
// have none.
export const PLAYGROUND_SOURCES = ["user", "import", "osm", "other"] as const;
export type PlaygroundSource = (typeof PLAYGROUND_SOURCES)[number];

export function isPlaygroundSource(value: unknown): value is PlaygroundSource {
  return (PLAYGROUND_SOURCES as readonly unknown[]).includes(value);
}

// Features as booleans: an unknown one (null in the database) counts as not having it.
export type MapPlayground = Record<FeatureKey, boolean> & {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  surfaces: SurfaceType[];
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
