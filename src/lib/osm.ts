// Links to OpenStreetMap for the review queue (ADR-0003): the feature a discovery came from, and the
// map at a playground's pin, to check it is a playground and is where it says.

// OSM ids as discovery stores them: "node/123", "way/456" or "relation/789".
const OSM_FEATURE = /^(node|way|relation)\/[1-9]\d*$/;

export function osmFeatureUrl(source: string | null, externalId: string | null): string | null {
  if (source !== "osm" || !externalId || !OSM_FEATURE.test(externalId)) return null;
  return `https://www.openstreetmap.org/${externalId}`;
}

export function osmPinUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=19/${lat}/${lng}`;
}
