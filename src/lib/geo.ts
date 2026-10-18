// Great-circle distance between two lat/lng points, in metres.
export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// "350 m", "1,2 km", "18 km" in the visitor's locale (decimal comma in Slovenian).
export function formatDistance(meters: number, locale: string): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  const km = new Intl.NumberFormat(locale, { maximumFractionDigits: meters < 10_000 ? 1 : 0 }).format(meters / 1000);
  return `${km} km`;
}
