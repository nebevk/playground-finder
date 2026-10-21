import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import sl from "@/messages/sl.json";
import { EQUIPMENT_KEYS } from "@/lib/playground-types";

// Leaf path → string. Arrays (e.g. privacy.dataCollected.items) flatten to index keys.
function flatten(value: unknown, path = "", out = new Map<string, string>()) {
  if (typeof value === "string") out.set(path, value);
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) flatten(v, path ? `${path}.${k}` : k, out);
  return out;
}

const slKeys = flatten(sl);
const enKeys = flatten(en);

const SRC = join(process.cwd(), "src");
const sourceFiles = readdirSync(SRC, { recursive: true, encoding: "utf8" })
  .filter((f) => /\.(ts|tsx)$/.test(f))
  .map((f) => join(SRC, f));

describe("localization", () => {
  it("[NFR-I18N-02] sl.json and en.json have exactly the same keys", () => {
    expect([...slKeys.keys()].filter((k) => !enKeys.has(k))).toEqual([]);
    expect([...enKeys.keys()].filter((k) => !slKeys.has(k))).toEqual([]);
  });

  it("[NFR-I18N-02] no translation is empty", () => {
    const empty = [...slKeys, ...enKeys].filter(([, v]) => v.trim() === "").map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it("[NFR-I18N-03] the brand name exists only as the app.name key", () => {
    const brands = [slKeys.get("app.name"), enKeys.get("app.name")];
    for (const b of brands) expect(b, "app.name must be set in both locales").toBeTruthy();

    // Strip trailing punctuation ("Kje so igrala?") so near-matches are caught too.
    const needles = [...new Set(brands.map((b) => b!.replace(/[?!.]+$/, "")))];
    const offenders = sourceFiles.filter((f) => {
      const text = readFileSync(f, "utf8");
      return needles.some((n) => text.includes(n));
    });
    expect(offenders).toEqual([]);
  });

  it("[NFR-I18N-03] every known equipment value has a label in both languages, and the detail page uses it", () => {
    for (const key of EQUIPMENT_KEYS) {
      expect(slKeys.get(`detail.equipmentOptions.${key}`), key).toBeTruthy();
      expect(enKeys.get(`detail.equipmentOptions.${key}`), key).toBeTruthy();
    }
    const page = readFileSync(join(SRC, "app", "[locale]", "playground", "[id]", "page.tsx"), "utf8");
    expect(page).toContain("equipmentOptions.");
  });
});

describe("photo upload disclaimer", () => {
  it("[GDPR-07] the Slovenian disclaimer about children's faces has the exact required text", () => {
    expect(slKeys.get("add.step3.disclaimer")).toBe(
      "Prosimo, ne objavljaj fotografij, na katerih so prepoznavni obrazi otrok.",
    );
    expect(enKeys.get("add.step3.disclaimer")).toBe(
      "Please do not post photos with identifiable faces of children.",
    );
  });

  it("[GDPR-07] every photo upload shows the disclaimer", () => {
    // The shared picker renders it; both places that upload photos use the picker.
    const picker = readFileSync(join(SRC, "components", "Playground", "PhotoPicker.tsx"), "utf8");
    expect(picker).toContain('t("step3.disclaimer")');
    for (const form of [
      join(SRC, "app", "[locale]", "add", "AddFlow.tsx"),
      join(SRC, "app", "[locale]", "playground", "[id]", "photos", "AddPhotosForm.tsx"),
    ]) {
      expect(readFileSync(form, "utf8")).toContain("<PhotoPicker ");
    }
  });
});
