import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createTranslator } from "next-intl";
import en from "@/messages/en.json";
import sl from "@/messages/sl.json";

// Shared by the link-preview images (opengraph-image.tsx): the design kit's purple, its swing mark
// and its fonts, so a shared link shows the brand instead of an empty placeholder. Text comes from
// the message files, so the name and slogan stay swappable. Never user photos (GDPR-16).

export const OG_SIZE = { width: 1200, height: 630 };

// Straight from the message files: these images are also prepared at build time, where the
// request-based getTranslations can't run.
export function ogTranslator(locale: string) {
  return createTranslator({ locale, messages: locale === "en" ? en : sl });
}

export const BRAND = {
  purple: "#8e4ae2",
  magenta: "#ac46b9",
  lavender: "#ebe3f5",
  background: "#f8f8f8",
  ink: "#1f1b2d",
  muted: "#5b566b",
  pink: "#f6c4ea",
  star: "#f9b818",
  starEdge: "#cf8600",
};

const ASSETS = join(process.cwd(), "assets", "og");

// Fonts and marks are read once per server instance. TrueType, because the image renderer can't
// read WOFF2. Both fonts are under the SIL Open Font License (assets/og/OFL-*.txt).
let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 700 | 800 }[]> | null = null;
export function ogFonts() {
  fonts ??= Promise.all([
    readFile(join(ASSETS, "BubblegumSans-Regular.ttf")).then((data) => ({ name: "Bubblegum Sans", data, weight: 400 as const })),
    readFile(join(ASSETS, "Nunito-Bold.ttf")).then((data) => ({ name: "Nunito", data, weight: 700 as const })),
    readFile(join(ASSETS, "Nunito-ExtraBold.ttf")).then((data) => ({ name: "Nunito", data, weight: 800 as const })),
  ]);
  return fonts;
}

const marks = new Map<string, Promise<string>>();
/** The kit's swing mark as a data URL: white on purple, or purple on light. */
export function ogMark(variant: "on-purple" | "light") {
  let mark = marks.get(variant);
  if (!mark) {
    mark = readFile(join(ASSETS, `mark-${variant}.svg`)).then(
      (svg) => `data:image/svg+xml;base64,${svg.toString("base64")}`,
    );
    marks.set(variant, mark);
  }
  return mark;
}

/** The mark's proportions (viewBox 244 × 220). */
export const MARK_RATIO = 220 / 244;

/** The kit's wordmark: the name in Bubblegum Sans with a soft gradient. */
export function Wordmark({ name, size, from, to }: { name: string; size: number; from: string; to: string }) {
  return (
    <div
      style={{
        fontFamily: "Bubblegum Sans",
        fontSize: size,
        lineHeight: 1.05,
        backgroundImage: `linear-gradient(90deg, ${from}, ${to})`,
        backgroundClip: "text",
        color: "transparent",
      }}
    >
      {name}
    </div>
  );
}
