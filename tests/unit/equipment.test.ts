import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EQUIPMENT_KEYS, equipmentFrom } from "@/lib/playground-types";

const MIGRATIONS = join(__dirname, "..", "..", "supabase", "migrations");

describe("equipment", () => {
  it("[FR-ADD-07] the database accepts exactly the equipment the app offers", () => {
    const file = readdirSync(MIGRATIONS).find((f) => f.endsWith("_equipment_and_insert_columns.sql"))!;
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");
    const lists = [...sql.matchAll(/equipment <@ '(\[[^']*\])'::jsonb/g)].map((m) => JSON.parse(m[1]));
    expect(lists.length).toBeGreaterThan(0);
    for (const list of lists) expect(list).toEqual([...EQUIPMENT_KEYS]);
  });

  it("[FR-ADD-07] a form's ticked equipment is read as known keys only, in list order", () => {
    const fd = new FormData();
    for (const value of ["sandbox", "moat", "swings", "sandbox"]) fd.append("equipment", value);
    expect(equipmentFrom(fd)).toEqual(["swings", "sandbox"]);
    expect(equipmentFrom(new FormData())).toEqual([]);
  });
});
