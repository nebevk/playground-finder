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
};

export type PlaygroundPhoto = {
  id: string;
  url: string;
};

export type PlaygroundDetail = MapPlayground & {
  equipment: string[];
  photos: PlaygroundPhoto[];
};
