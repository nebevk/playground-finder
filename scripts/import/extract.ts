import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ExtractionResult } from "./types";
import type { FetchedPage } from "./fetch";

const SYSTEM_PROMPT = `You extract structured playground records from Slovenian web pages (blog posts, city tourism sites, parenting articles).

Output rules — read carefully:
- A page may describe ONE playground or MANY. Return one entry per distinct playground.
- Descriptions you write must be in Slovenian, written in your own words. Do NOT copy phrases verbatim from the source — paraphrase the facts.
- Boolean fields default to false. Only set true when the source explicitly mentions the feature. Inferring "probably has a fence" from a photo description is not enough.
- surface_type values: "tartan" (rubber/soft surface), "sand", "grass", "gravel". null if unknown.
- equipment: snake_case English tags only (swings, slides, zipline, sandbox, climbing_wall, seesaw, spring_riders, trampoline, etc.). Empty array if no equipment mentioned.
- latitude/longitude: only fill in if you find decimal coordinates IN the source text. Do not invent them.
- address: a street, neighborhood, or town that could be geocoded. Fill it in even when you also have coordinates.
- confidence: "high" if name + location + several features are clear; "low" if most fields were guesses; "medium" otherwise.
- notes: leave null unless something would help a human reviewer (e.g. "Page seems to describe two playgrounds at one location — split or merge?").

Do not output anything except the JSON the schema demands.`;

export async function extractPlaygrounds(page: FetchedPage): Promise<ExtractionResult> {
  const client = new Anthropic();

  const userContent =
    `Source URL: ${page.url}\n` +
    (page.title ? `Page title: ${page.title}\n` : "") +
    (page.hintedCoords
      ? `Embedded map coords (use these unless the prose contradicts them): ${page.hintedCoords.latitude}, ${page.hintedCoords.longitude}\n`
      : "") +
    `\n--- PAGE TEXT ---\n${page.text}`;

  const response = await client.messages.parse({
    model: "claude-opus-4-7",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userContent }],
    output_config: {
      format: zodOutputFormat(ExtractionResult),
      effort: "low",
    },
  });

  if (!response.parsed_output) {
    throw new Error(`LLM extraction returned no parseable output for ${page.url}`);
  }
  return response.parsed_output;
}
