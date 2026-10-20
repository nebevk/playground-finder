"use client";

import { AttributionControl, MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { fixLeafletDefaultIcons } from "./fix-leaflet-icons";
import { playgroundMarkerIcon } from "./playground-marker";
import { OSM_ATTRIBUTION, OSM_TILE_URL } from "./tiles";

fixLeafletDefaultIcons();

export function StaticMap({
  lat,
  lng,
  zoom = 16,
  marker = true,
}: {
  lat: number;
  lng: number;
  zoom?: number;
  marker?: boolean;
}) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={zoom}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      zoomControl={false}
      attributionControl={false}
      className="h-full w-full"
    >
      {/* OSM's tile policy requires the credit (it was missing here). */}
      <AttributionControl position="bottomright" prefix={false} />
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      {marker && <Marker position={[lat, lng]} icon={playgroundMarkerIcon} />}
    </MapContainer>
  );
}
