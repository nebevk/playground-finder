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
          fill="oklch(82% 0.119 306.383)" stroke="oklch(29% 0.149 302.717)" stroke-width="2"/>
    <circle cx="20" cy="19" r="9" fill="white"/>
    <g fill="oklch(29% 0.149 302.717)">
      <rect x="13" y="13" width="2.5" height="12" rx="1.2"/>
      <rect x="20" y="13" width="2.5" height="12" rx="1.2"/>
      <rect x="13" y="15" width="9.5" height="1.5" rx="0.7"/>
      <rect x="13" y="18.5" width="9.5" height="1.5" rx="0.7"/>
      <rect x="13" y="22" width="9.5" height="1.5" rx="0.7"/>
      <path d="M22.5 13 Q28 17 26 25" stroke="oklch(29% 0.149 302.717)" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    </g>
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
