import L from "leaflet";

const PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="36" height="46">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-opacity="0.35"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <path d="M20 1C10 1 2 9 2 19c0 12 14 28 18 32 4-4 18-20 18-32 0-10-8-18-18-18z"
          fill="oklch(57% 0.22 300)" stroke="oklch(38% 0.16 300)" stroke-width="2"/>
    <circle cx="20" cy="19" r="6" fill="white"/>
  </g>
</svg>
`;

export const playgroundMarkerIcon = L.divIcon({
  html: PIN_SVG,
  className: "playground-marker",
  iconSize: [36, 46],
  iconAnchor: [18, 46],
  popupAnchor: [0, -40],
});

// The pin whose sheet is open: larger, so it stays findable above the sheet.
export const selectedMarkerIcon = L.divIcon({
  html: PIN_SVG.replace('width="36" height="46"', 'width="48" height="62"'),
  className: "playground-marker playground-marker--selected",
  iconSize: [48, 62],
  iconAnchor: [24, 62],
});

// Brand-coloured cluster bubbles (instead of the default green/yellow/orange), 44 px to tap.
export function clusterIcon(cluster: { getChildCount: () => number }) {
  return L.divIcon({
    html: `<span>${cluster.getChildCount()}</span>`,
    className: "marker-cluster brand-cluster",
    iconSize: L.point(44, 44),
  });
}
