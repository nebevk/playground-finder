import "dotenv/config";
import { readdirSync, readFileSync, renameSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import type { StagedFile } from "./types";

const here = dirname(fileURLToPath(import.meta.url));
const APPROVED_DIR = join(here, "approved");
const IMPORTED_DIR = join(here, "imported");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY required in .env.local.");
    process.exit(1);
  }

  if (!existsSync(APPROVED_DIR)) {
    console.error(`No ${APPROVED_DIR}. Create it and move approved JSON files from output/ into it.`);
    process.exit(1);
  }
  mkdirSync(IMPORTED_DIR, { recursive: true });

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const files = readdirSync(APPROVED_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log("Nothing to import — approved/ is empty.");
    return;
  }

  console.log(`Importing ${files.length} file(s)…`);
  let inserted = 0;
  let skipped = 0;

  for (const file of files) {
    const path = join(APPROVED_DIR, file);
    const staged = JSON.parse(readFileSync(path, "utf8")) as StagedFile;

    for (const pg of staged.playgrounds) {
      if (pg.latitude == null || pg.longitude == null) {
        console.warn(`  skip "${pg.name}" — no coordinates`);
        skipped++;
        continue;
      }

      const { error } = await supabase.from("playgrounds").insert({
        name: pg.name,
        description: pg.description,
        location: `SRID=4326;POINT(${pg.longitude} ${pg.latitude})`,
        is_fenced: pg.is_fenced,
        has_shade: pg.has_shade,
        has_water: pg.has_water,
        has_toilets: pg.has_toilets,
        has_parking: pg.has_parking,
        surface_type: pg.surface_type,
        equipment: pg.equipment,
        user_id: null,
      });

      if (error) {
        console.error(`  FAIL "${pg.name}":`, error.message);
        skipped++;
      } else {
        console.log(`  ✓ "${pg.name}"`);
        inserted++;
      }
    }

    renameSync(path, join(IMPORTED_DIR, file));
  }

  console.log(`\nDone. Inserted ${inserted}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
