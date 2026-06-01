import * as cheerio from "cheerio";

const USER_AGENT =
  "playground-finder-import/0.1 (https://github.com/anthropics; contact local)";

const STRIP_SELECTORS = [
  "script",
  "style",
  "noscript",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  ".comments",
  "#comments",
  ".cookie",
  ".cookie-banner",
  ".social-share",
  ".sidebar",
  ".widget",
  ".navigation",
  ".menu",
  ".breadcrumb",
];

const CONTENT_SELECTORS = ["article", "main", "[role=main]", ".entry-content", ".post-content"];

export type FetchedPage = {
  url: string;
  title: string | null;
  text: string;
  hintedCoords: { latitude: number; longitude: number } | null;
};

export async function fetchPage(url: string): Promise<FetchedPage> {
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();

  const $ = cheerio.load(html);

  const title = $("h1").first().text().trim() || $("title").text().trim() || null;
  const hintedCoords = findCoordsInHtml($, html);

  STRIP_SELECTORS.forEach((sel) => $(sel).remove());

  let rawText = $("body").text();
  for (const sel of CONTENT_SELECTORS) {
    const candidate = $(sel).first();
    const candidateText = candidate.text();
    if (candidate.length && candidateText.length > 200) {
      rawText = candidateText;
      break;
    }
  }

  const text = rawText.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();

  const MAX_CHARS = 30_000;
  return {
    url,
    title,
    text: text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + "\n…[truncated]" : text,
    hintedCoords,
  };
}

function findCoordsInHtml(
  $: cheerio.CheerioAPI,
  rawHtml: string,
): { latitude: number; longitude: number } | null {
  for (const iframe of $("iframe[src]").toArray()) {
    const src = $(iframe).attr("src") || "";
    const m = src.match(/!3d(-?\d+\.\d+)!2d(-?\d+\.\d+)|q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) {
      const lat = parseFloat(m[1] ?? m[3]);
      const lng = parseFloat(m[2] ?? m[4]);
      if (validCoords(lat, lng)) return { latitude: lat, longitude: lng };
    }
  }

  for (const a of $('a[href*="maps"]').toArray()) {
    const href = $(a).attr("href") || "";
    const m = href.match(/@(-?\d+\.\d+),(-?\d+\.\d+)|q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) {
      const lat = parseFloat(m[1] ?? m[3]);
      const lng = parseFloat(m[2] ?? m[4]);
      if (validCoords(lat, lng)) return { latitude: lat, longitude: lng };
    }
  }

  const inline = rawHtml.match(/"lat"\s*:\s*(-?\d+\.\d+)[^}]*"lng"\s*:\s*(-?\d+\.\d+)/);
  if (inline) {
    const lat = parseFloat(inline[1]);
    const lng = parseFloat(inline[2]);
    if (validCoords(lat, lng)) return { latitude: lat, longitude: lng };
  }

  return null;
}

function validCoords(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && lat >= 45 && lat <= 47 && lng >= 13 && lng <= 17
  );
}
