// Ops handoff ledger check — see ops/README.md.
//
//   pnpm ops:check               validate every ticket in ops/handoff/ and list what's ready
//   pnpm ops:check --stamp 0002  record checksums of ticket 0002's migrations (before `ready`)
//
// Fails when a migration newer than the baseline isn't owned by a ticket, when a ticket's
// migration changed after it was stamped (or applied), or when a ticket is malformed.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const TICKET_DIR = join(ROOT, "ops", "handoff");
const MIGRATION_DIR = join(ROOT, "supabase", "migrations");
const { baseline } = JSON.parse(readFileSync(join(ROOT, "ops", "config.json"), "utf8")) as { baseline: string };

const STATUSES = ["draft", "ready", "in-progress", "done", "failed", "blocked"];
const ORDERS = ["migrations-first", "code-first", "any"];
const REQUIRED = ["id", "title", "status", "order", "destructive", "migrations"];

type Fields = Record<string, string | string[]>;
type Ticket = { file: string; text: string; fields: Fields };

const errors: string[] = [];
const fail = (msg: string) => errors.push(msg);

// Frontmatter is a strict subset of YAML: `key: value` or `key: [a, b]`, `# comments` allowed.
function parseFrontmatter(file: string, text: string): Fields {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!m) throw new Error(`${file}: missing --- frontmatter ---`);
  const fields: Fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const clean = line.replace(/\s+#.*$/, "").trim();
    if (!clean) continue;
    const kv = /^([a-z_]+):\s*(.*)$/.exec(clean);
    if (!kv) throw new Error(`${file}: cannot parse frontmatter line: ${line}`);
    const list = /^\[(.*)\]$/.exec(kv[2]);
    fields[kv[1]] = list ? list[1].split(",").map((s) => s.trim()).filter(Boolean) : kv[2];
  }
  return fields;
}

// Line endings normalised so Windows (CRLF) and CI (LF) checkouts hash the same.
const checksum = (file: string) =>
  createHash("sha256")
    .update(readFileSync(join(MIGRATION_DIR, file), "utf8").replace(/\r\n/g, "\n"))
    .digest("hex")
    .slice(0, 16);

const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const version = (migration: string) => migration.split("_")[0];

const migrations = readdirSync(MIGRATION_DIR).filter((f) => f.endsWith(".sql")).sort();
const tickets: Ticket[] = readdirSync(TICKET_DIR)
  .filter((f) => /^\d{4}-.+\.md$/.test(f))
  .sort()
  .map((file) => {
    const text = readFileSync(join(TICKET_DIR, file), "utf8");
    return { file, text, fields: parseFrontmatter(file, text) };
  });

// --stamp <id>: write checksums into the ticket's frontmatter.
const stampIdx = process.argv.indexOf("--stamp");
if (stampIdx !== -1) {
  const id = process.argv[stampIdx + 1];
  const t = tickets.find((x) => x.fields.id === id);
  if (!t) throw new Error(`--stamp: no ticket with id ${id}`);
  const sums = list(t.fields.migrations).map(checksum);
  const line = `checksums: [${sums.join(", ")}]`;
  const text = /^checksums:.*$/m.test(t.text)
    ? t.text.replace(/^checksums:.*$/m, line)
    : t.text.replace(/^(migrations:.*)$/m, `$1\n${line}`);
  writeFileSync(join(TICKET_DIR, t.file), text);
  t.text = text;
  t.fields = parseFrontmatter(t.file, text);
  console.log(`Stamped ${t.file}: ${line}`);
}

const owner = new Map<string, string>();
const ids = new Set<string>();

for (const { file, fields } of tickets) {
  for (const key of REQUIRED) if (!(key in fields)) fail(`${file}: missing "${key}"`);
  const id = String(fields.id ?? "");
  if (!file.startsWith(`${id}-`)) fail(`${file}: id ${id} does not match the file name`);
  if (ids.has(id)) fail(`${file}: duplicate id ${id}`);
  ids.add(id);

  const status = String(fields.status);
  if (!STATUSES.includes(status)) fail(`${file}: status "${status}" is not one of ${STATUSES.join(", ")}`);
  if (!ORDERS.includes(String(fields.order))) fail(`${file}: order must be one of ${ORDERS.join(", ")}`);
  if (!["true", "false"].includes(String(fields.destructive))) fail(`${file}: destructive must be true or false`);

  const own = list(fields.migrations);
  const sums = list(fields.checksums);
  for (const [i, mig] of own.entries()) {
    if (!migrations.includes(mig)) {
      fail(`${file}: migration ${mig} not found in supabase/migrations`);
      continue;
    }
    if (version(mig) <= baseline) fail(`${file}: ${mig} is at or before the baseline (${baseline}) — already in prod`);
    if (owner.has(mig)) fail(`${file}: ${mig} is also claimed by ${owner.get(mig)}`);
    owner.set(mig, file);
    if (status === "draft") continue;
    if (!sums[i]) fail(`${file}: no checksum for ${mig} — run pnpm ops:check --stamp ${id}`);
    else if (sums[i] !== checksum(mig)) {
      fail(
        status === "done"
          ? `${file}: ${mig} changed AFTER it was applied to production. Never edit an applied migration — write a new one.`
          : `${file}: ${mig} changed since it was stamped. Re-run local verification, then pnpm ops:check --stamp ${id}`,
      );
    }
  }
}

for (const { file, fields } of tickets) {
  for (const dep of list(fields.depends_on)) if (!ids.has(dep)) fail(`${file}: depends_on ${dep} does not exist`);
}

for (const mig of migrations) {
  if (version(mig) > baseline && !owner.has(mig)) {
    fail(`supabase/migrations/${mig} is newer than the baseline but no ops ticket owns it`);
  }
}

const byStatus = (s: string) => tickets.filter((t) => t.fields.status === s);
console.log(`Ops tickets: ${tickets.length} · baseline ${baseline} · ${migrations.length} migrations in repo`);
for (const s of STATUSES) {
  const ts = byStatus(s);
  if (ts.length) console.log(`  ${s.padEnd(11)} ${ts.map((t) => `${t.fields.id} ${t.fields.title}`).join("\n              ")}`);
}
const ready = byStatus("ready");
if (ready.length) console.log(`\n→ ${ready.length} ticket(s) ready for Cursor: say "process ops" in Cursor.`);
const stuck = [...byStatus("failed"), ...byStatus("blocked"), ...byStatus("in-progress")];
if (stuck.length) console.log(`! Needs attention: ${stuck.map((t) => `${t.fields.id} (${t.fields.status})`).join(", ")}`);

if (errors.length) {
  console.error(`\n✖ ${errors.length} problem(s):\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log("\n✔ Ops ledger is consistent.");
