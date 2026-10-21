import {
  PLAYGROUND_FEATURE_KEYS,
  SURFACE_TYPES,
  type FeatureKey,
  type MapPlayground,
} from "./playground-types";

// The map snapshot (ADR-0001): every public playground, packed, cached once for everyone under
// this tag. Server Actions that change what the map shows expire it (invalidateMapSnapshot).
export const MAP_TAG = "playgrounds:map";

/** The sheet shows two lines of the description; the detail page has the full text. */
export const MAP_DESCRIPTION_MAX = 120;

/** Half of the Vercel Data Cache's 2 MB entry limit: past that, caching silently stops. */
export const MAP_SNAPSHOT_BUDGET_BYTES = 1_000_000;
export const DATA_CACHE_LIMIT_BYTES = 2_000_000;

/**
 * One playground, packed by position instead of as an object: repeating a dozen keys per row
 * cost more than the data. The browser unpacks it (unpackSnapshot).
 */
export type PackedPlayground = [
  id: string,
  name: string,
  lat: number,
  lng: number,
  /** Bit i set: has PLAYGROUND_FEATURE_KEYS[i]. */
  features: number,
  /** Index into SURFACE_TYPES; -1 when unknown. */
  surface: number,
  reviewCount: number,
  /** Average rating × 10, rounded (the app shows one decimal); 0 when there are none. */
  rating: number,
  description?: string,
];

export function packPlayground(p: MapPlayground): PackedPlayground {
  const features = PLAYGROUND_FEATURE_KEYS.reduce((bits, key, i) => (p[key] ? bits | (1 << i) : bits), 0);
  const packed: PackedPlayground = [
    p.id,
    p.name,
    // About a metre.
    Math.round(p.lat * 1e5) / 1e5,
    Math.round(p.lng * 1e5) / 1e5,
    features,
    p.surface_type ? SURFACE_TYPES.indexOf(p.surface_type) : -1,
    p.review_count,
    p.avg_rating == null || p.review_count === 0 ? 0 : Math.round(p.avg_rating * 10),
  ];
  if (p.description) packed.push(truncateAtWord(p.description, MAP_DESCRIPTION_MAX));
  return packed;
}

export function unpackPlayground([id, name, lat, lng, features, surface, reviewCount, rating, description]: PackedPlayground): MapPlayground {
  const has = Object.fromEntries(PLAYGROUND_FEATURE_KEYS.map((key, i) => [key, (features & (1 << i)) !== 0])) as Record<
    FeatureKey,
    boolean
  >;
  return {
    id,
    name,
    description: description ?? null,
    lat,
    lng,
    ...has,
    surface_type: surface >= 0 ? SURFACE_TYPES[surface] : null,
    review_count: reviewCount,
    avg_rating: rating > 0 ? rating / 10 : null,
  };
}

export function unpackSnapshot(packed: PackedPlayground[]): MapPlayground[] {
  return packed.map(unpackPlayground);
}

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}
