import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchPage } from "./fetch";
import { extractPlaygrounds } from "./extract";
import { geocodeSI } from "./geocode";
import type { PlaygroundRecord, StagedFile } from "./types";

const here = dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = join(here, "input", "urls.txt");
const OUTPUT_DIR = join(here, "output");

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY missing. Put it in .env.local.");
    process.exit(1);
  }
  if (!existsSync(INPUT_FILE)) {
    console.error(`No input file at ${INPUT_FILE}. Create it with one URL per line.`);
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const urls = readFileSync(INPUT_FILE, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  if (urls.length === 0) {
    console.error("No URLs found in input/urls.txt.");
    process.exit(1);
  }

  console.log(`Scraping ${urls.length} URL(s)…`);
  for (const [i, url] of urls.entries()) {
    const tag = `[${i + 1}/${urls.length}]`;
    try {
      console.log(`${tag} ${url}`);
      const page = await fetchPage(url);
      console.log(`${tag}   fetched (${page.text.length} chars)${page.hintedCoords ? " + map coords" : ""}`);

      const result = await extractPlaygrounds(page);
      console.log(`${tag}   extracted ${result.playgrounds.length} playground(s)`);

      const filled: PlaygroundRecord[] = [];
      for (const pg of result.playgrounds) {
        const enriched = await fillMissingCoords(pg, page.hintedCoords);
        filled.push(enriched);
      }

      const staged: StagedFile = {
        source_url: url,
        scraped_at: new Date().toISOString(),
        raw_text_preview: page.text.slice(0, 500),
        playgrounds: filled,
      };

      const outPath = join(OUTPUT_DIR, slugify(url) + ".json");
      writeFileSync(outPath, JSON.stringify(staged, null, 2), "utf8");
      console.log(`${tag}   → ${outPath}`);
    } catch (err) {
      console.error(`${tag}   FAILED:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("\nDone. Review the JSON in scripts/import/output/, then move approved files to scripts/import/approved/ and run `pnpm import:push`.");
}

async function fillMissingCoords(
  pg: PlaygroundRecord,
  pageHint: { latitude: number; longitude: number } | null,
): Promise<PlaygroundRecord> {
  if (pg.latitude != null && pg.longitude != null) return pg;

  if (pageHint && pg.latitude == null && pg.longitude == null) {
    return { ...pg, latitude: pageHint.latitude, longitude: pageHint.longitude };
  }

  const query = pg.address ?? pg.name;
  if (!query) return pg;

  try {
    const hit = await geocodeSI(`${query}, Slovenia`);
    if (hit) return { ...pg, latitude: hit.latitude, longitude: hit.longitude };
  } catch (err) {
    console.warn(`   geocode failed for "${query}":`, err instanceof Error ? err.message : err);
  }
  return pg;
}

function slugify(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
