import L from "leaflet";

// Leaflet's default icon URLs break under bundlers (the images get fingerprinted).
// Pin them to the unpkg CDN instead. Run once on first import.
let patched = false;
export function fixLeafletDefaultIcons() {
  if (patched) return;
  patched = true;

  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}
