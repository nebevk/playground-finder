"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fixLeafletDefaultIcons } from "./fix-leaflet-icons";
import { playgroundMarkerIcon } from "./playground-marker";

fixLeafletDefaultIcons();

const LJUBLJANA: [number, number] = [46.0569, 14.5058];

export type PreviewPoint = { id: string; lat: number; lng: number };

function FitBounds({ points }: { points: PreviewPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) {
      map.setView(LJUBLJANA, 11);
      return;
    }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 });
  }, [points, map]);
  return null;
}

// A non-interactive map snapshot that shows the playground pins. Used as the home
// landing's "explore the map" teaser.
export function MapPreview({ points }: { points: PreviewPoint[] }) {
  return (
    <MapContainer
      center={LJUBLJANA}
      zoom={11}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      zoomControl={false}
      attributionControl={false}
      keyboard={false}
      className="h-full w-full"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {points.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={playgroundMarkerIcon}
          interactive={false}
        />
      ))}
      <FitBounds points={points} />
    </MapContainer>
  );
}
