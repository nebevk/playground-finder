// OpenStreetMap's standard tiles. One host: OSM asks clients to stop using the a/b/c
// subdomains, since it serves everything over HTTP/2.
export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

// The credit OSM's tile policy requires on every map that shows its tiles.
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// The same credit as plain text, for a map that sits inside a link (no nested <a>).
export const OSM_ATTRIBUTION_TEXT = "&copy; OpenStreetMap";
