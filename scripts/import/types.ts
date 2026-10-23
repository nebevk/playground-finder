import { z } from "zod";
import { EQUIPMENT_KEYS, SURFACE_TYPES } from "../../src/lib/playground-types";

// "tartan" is still accepted from sources (it's the same as rubber tiles; push.ts maps it).
export const SurfaceType = z.enum([...SURFACE_TYPES, "tartan"]);
export type SurfaceType = z.infer<typeof SurfaceType>;

export const PlaygroundRecord = z.object({
  name: z
    .string()
    .describe(
      "Playground name in Slovenian. Use the most specific name from the source (e.g. 'Igrišče Tivoli', not 'Park').",
    ),
  description: z
    .string()
    .nullable()
    .describe(
      "Short (1-3 sentence) Slovenian description WRITTEN IN YOUR OWN WORDS. Do NOT copy or paraphrase the source. Summarize the facts only.",
    ),
  latitude: z
    .number()
    .nullable()
    .describe("Decimal latitude if the source includes one (e.g. embedded map). null otherwise."),
  longitude: z
    .number()
    .nullable()
    .describe("Decimal longitude. null if not present in the source."),
  address: z
    .string()
    .nullable()
    .describe(
      "Street address or locality (e.g. 'Tržaška cesta 132, Ljubljana') for geocoding fallback if no coordinates were found.",
    ),
  is_fenced: z.boolean().describe("True only if the source explicitly says the playground is fenced."),
  has_shade: z.boolean().describe("True only if the source explicitly mentions shade (trees, awnings)."),
  has_water: z.boolean().describe("True only if the source mentions a drinking fountain or water source."),
  has_toilets: z.boolean().describe("True only if the source mentions toilets nearby."),
  has_parking: z.boolean().describe("True only if the source mentions parking nearby."),
  has_benches: z.boolean().describe("True only if the source mentions benches or seating for parents."),
  has_toddler_area: z.boolean().describe("True only if the source mentions a separate area or equipment for toddlers or babies."),
  is_accessible: z.boolean().describe("True only if the source says it is reachable with a pram or wheelchair (no steps)."),
  has_lighting: z.boolean().describe("True only if the source mentions lighting in the evening."),
  surface_type: SurfaceType.nullable().describe(
    "rubber_tiles (or tartan: poured rubber), sand, grass, artificial_turf, woodchips (or bark), gravel, asphalt. null if not stated.",
  ),
  equipment: z
    .array(z.string())
    .describe(
      `Equipment, only from these tags: ${EQUIPMENT_KEYS.join(", ")} (anything else is dropped). baby_swings = enclosed swing seats for babies and toddlers. Empty array if none mentioned.`,
    ),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe(
      "How confident you are that this record is accurate. 'low' if many fields had to be guessed.",
    ),
  notes: z
    .string()
    .nullable()
    .describe("Optional note to the human reviewer about ambiguities or things to double-check."),
});
export type PlaygroundRecord = z.infer<typeof PlaygroundRecord>;

export const ExtractionResult = z.object({
  playgrounds: z
    .array(PlaygroundRecord)
    .describe(
      "All playgrounds described on this page. Many Slovenian blog posts list multiple playgrounds in one article — return one entry per distinct playground.",
    ),
});
export type ExtractionResult = z.infer<typeof ExtractionResult>;

export type StagedFile = {
  source_url: string;
  scraped_at: string;
  raw_text_preview: string;
  playgrounds: PlaygroundRecord[];
};
