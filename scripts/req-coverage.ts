// Requirement → test traceability check (`pnpm test:req`).
//
// Reads the requirement tables in docs/requirements/*.md and the IDs named in test titles
// (e.g. "[GDPR-01] ..."). Fails when a Done/Partial requirement has no test in a layer its
// Verify column lists, or when a test names an ID that doesn't exist.
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

type Layer = "unit" | "db" | "e2e";
type Req = { id: string; status: string; verify: string[]; file: string };

const ROOT = process.cwd();
const REQ_DIR = join(ROOT, "docs", "requirements");
const ID = String.raw`(?:FR-[A-Z]+-\d{2}|NFR-[A-Z0-9]+-\d{2}|GDPR-\d{2})`;
const ROW = new RegExp(String.raw`^\|\s*(${ID})\s*\|.*\|\s*(Must|Should|Could)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$`);

const LAYERS: Record<Layer, { dir: string; match: RegExp }> = {
  unit: { dir: "tests/unit", match: /\.test\.ts$/ },
  db: { dir: "supabase/tests", match: /\.sql$/ },
  e2e: { dir: "tests/e2e", match: /\.spec\.ts$/ },
};

function readRequirements(): Req[] {
  const reqs: Req[] = [];
  for (const name of readdirSync(REQ_DIR).filter((f) => f.endsWith(".md") && f !== "README.md")) {
    const file = join(REQ_DIR, name);
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = ROW.exec(line);
      if (!m) continue;
      const [, id, , statusCell, verifyCell] = m;
      reqs.push({
        id,
        status: /^(Done|Partial|Not started|Dropped)/.exec(statusCell)?.[1] ?? statusCell,
        verify: verifyCell.split(",").map((v) => v.trim()),
        file: relative(ROOT, file),
      });
    }
  }
  return reqs;
}

function readTestIds(): Record<Layer, Map<string, Set<string>>> {
  const out = {} as Record<Layer, Map<string, Set<string>>>;
  for (const [layer, { dir, match }] of Object.entries(LAYERS) as [Layer, (typeof LAYERS)[Layer]][]) {
    const ids = new Map<string, Set<string>>();
    const abs = join(ROOT, dir);
    let files: string[] = [];
    try {
      files = readdirSync(abs, { recursive: true, encoding: "utf8" }).filter((f) => match.test(f));
    } catch {
      // Layer has no tests yet.
    }
    for (const f of files) {
      for (const m of readFileSync(join(abs, f), "utf8").matchAll(new RegExp(String.raw`\[(${ID})\]`, "g"))) {
        if (!ids.has(m[1])) ids.set(m[1], new Set());
        ids.get(m[1])!.add(join(dir, f));
      }
    }
    out[layer] = ids;
  }
  return out;
}

const reqs = readRequirements();
const tested = readTestIds();
const known = new Set(reqs.map((r) => r.id));

const dupes = reqs.filter((r, i) => reqs.findIndex((x) => x.id === r.id) !== i).map((r) => r.id);
const missing: string[] = [];
const pending: string[] = [];
const manualOnly: string[] = [];

for (const r of reqs) {
  const auto = r.verify.filter((v): v is Layer => v in LAYERS);
  if (r.status === "Dropped") continue;
  if (r.status === "Not started") {
    pending.push(r.id);
    continue;
  }
  if (auto.length === 0) manualOnly.push(r.id);
  for (const layer of auto) {
    if (!tested[layer].has(r.id)) missing.push(`${r.id} (${r.status}) has no ${layer} test — ${r.file}`);
  }
}

const unknown = (Object.keys(LAYERS) as Layer[]).flatMap((layer) =>
  [...tested[layer]].filter(([id]) => !known.has(id)).map(([id, files]) => `${id} in ${[...files].join(", ")}`),
);

const count = (s: string) => reqs.filter((r) => r.status === s).length;
console.log(
  `Requirements: ${reqs.length} — Done ${count("Done")}, Partial ${count("Partial")}, ` +
    `Not started ${count("Not started")}, Dropped ${count("Dropped")}`,
);
for (const layer of Object.keys(LAYERS) as Layer[]) {
  console.log(`  ${layer.padEnd(4)} tests reference ${tested[layer].size} requirement IDs`);
}
if (manualOnly.length) console.log(`\nManual verification only (${manualOnly.length}): ${manualOnly.join(", ")}`);
if (pending.length) console.log(`Not started, no test required yet (${pending.length}): ${pending.join(", ")}`);

let failed = false;
if (dupes.length) {
  failed = true;
  console.error(`\n✖ Duplicate requirement IDs: ${dupes.join(", ")}`);
}
if (unknown.length) {
  failed = true;
  console.error(`\n✖ Tests reference unknown requirement IDs:\n  ${unknown.join("\n  ")}`);
}
if (missing.length) {
  failed = true;
  console.error(`\n✖ Missing tests (${missing.length}):\n  ${missing.join("\n  ")}`);
}
if (failed) process.exit(1);
console.log("\n✔ Every Done/Partial requirement has a test in each automated layer it lists.");
