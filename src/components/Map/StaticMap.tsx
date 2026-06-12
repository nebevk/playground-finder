"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { fixLeafletDefaultIcons } from "./fix-leaflet-icons";

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
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {marker && <Marker position={[lat, lng]} />}
    </MapContainer>
  );
}
