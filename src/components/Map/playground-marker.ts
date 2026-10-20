import L from "leaflet";

// Brand colours for map layers drawn as SVG or canvas, which can't read CSS variables.
// Keep in sync with --color-primary in globals.css.
export const BRAND = { primary: "oklch(57% 0.22 300)", primaryDark: "oklch(38% 0.16 300)" } as const;

// The brand pin (40×52 viewBox) at any size, optionally numbered. The drop shadow is CSS on the
// <svg> (overflow visible, so it isn't cut at the edges): an inline <filter id="shadow"> was
// repeated in every pin, and every pin referenced whichever copy came first in the document.
function pinSvg(width: number, height: number, rank?: number): string {
  const centre =
    rank === undefined
      ? '<circle cx="20" cy="19" r="6" fill="white"/>'
      : '<circle cx="20" cy="19" r="10.5" fill="white"/>' +
        `<text x="20" y="19.5" text-anchor="middle" dominant-baseline="central" fill="${BRAND.primaryDark}" style="font:800 14px var(--font-sans),system-ui,sans-serif">${rank}</text>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="${width}" height="${height}" ` +
    'style="display:block;overflow:visible;filter:drop-shadow(0 1.5px 1.2px rgb(0 0 0 / .35))">' +
    '<path d="M20 1C10 1 2 9 2 19c0 12 14 28 18 32 4-4 18-20 18-32 0-10-8-18-18-18z" ' +
    `fill="${BRAND.primary}" stroke="${BRAND.primaryDark}" stroke-width="2"/>${centre}</svg>`
  );
}

function pinIcon(width: number, height: number, className: string, rank?: number, extra: L.DivIconOptions = {}) {
  return L.divIcon({
    html: pinSvg(width, height, rank),
    className,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    ...extra,
  });
}

export const playgroundMarkerIcon = pinIcon(36, 46, "playground-marker", undefined, { popupAnchor: [0, -40] });

// The pin whose sheet is open: larger, so it stays findable above the sheet.
export const selectedMarkerIcon = pinIcon(48, 62, "playground-marker playground-marker--selected");

// Two-thirds size, for the small Home teaser, where full-size pins pile on top of each other.
export const compactMarkerIcon = pinIcon(26, 33, "playground-marker playground-marker--compact");

// Numbered pins for Home's "V bližini" results, matching the numbered rows. Cached: the
// marker is re-rendered on every hover, the icon shouldn't be rebuilt each time.
const rankedIcons = new Map<string, L.DivIcon>();
export function rankedMarkerIcon(rank: number, size: "sm" | "md" = "md"): L.DivIcon {
  const key = `${size}:${rank}`;
  let icon = rankedIcons.get(key);
  if (!icon) {
    const [width, height] = size === "md" ? [40, 52] : [34, 44];
    icon = pinIcon(width, height, "playground-marker playground-marker--ranked", rank);
    rankedIcons.set(key, icon);
  }
  return icon;
}

// The pin of the list row being hovered or focused on Home's desktop map (numbered if ranked).
const activeIcons = new Map<number, L.DivIcon>();
export function activeMarkerIcon(rank?: number): L.DivIcon {
  const key = rank ?? 0;
  let icon = activeIcons.get(key);
  if (!icon) {
    icon = pinIcon(48, 62, "playground-marker playground-marker--active", rank);
    activeIcons.set(key, icon);
  }
  return icon;
}

// Brand-coloured cluster bubbles (instead of the default green/yellow/orange): 44 px to tap, or
// 30 px on the small Home teaser, where nothing is tapped.
export function clusterIcon(cluster: { getChildCount: () => number }, size: "md" | "sm" = "md"): L.DivIcon {
  const px = size === "md" ? 44 : 30;
  return L.divIcon({
    html: `<span>${cluster.getChildCount()}</span>`,
    className: size === "md" ? "marker-cluster brand-cluster" : "marker-cluster brand-cluster brand-cluster--sm",
    iconSize: L.point(px, px),
  });
}

export const smallClusterIcon = (cluster: { getChildCount: () => number }) => clusterIcon(cluster, "sm");
