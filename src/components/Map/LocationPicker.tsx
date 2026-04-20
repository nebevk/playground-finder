"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import { LocateFixed } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { fixLeafletDefaultIcons } from "./fix-leaflet-icons";

fixLeafletDefaultIcons();

const LJUBLJANA: [number, number] = [46.0569, 14.5058];

type LatLng = { lat: number; lng: number };

function ClickToPlace({ onChange }: { onChange: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function GpsButton({ onChange }: { onChange: (pos: LatLng) => void }) {
  const map = useMap();

  function handle() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChange(next);
        map.setView([next.lat, next.lng], 16);
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      aria-label="Use my location"
      className="btn btn-circle btn-primary absolute right-3 bottom-3 z-[1000] shadow-lg"
    >
      <LocateFixed className="size-5" aria-hidden />
    </button>
  );
}

export function LocationPicker({
  value,
  onChange,
}: {
  value: LatLng | null;
  onChange: (pos: LatLng) => void;
}) {
  const markerRef = useRef<LeafletMarker | null>(null);

  useEffect(() => {
    const m = markerRef.current;
    if (m && value) m.setLatLng([value.lat, value.lng]);
  }, [value]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-box border border-base-300">
      <MapContainer
        center={value ? [value.lat, value.lng] : LJUBLJANA}
        zoom={value ? 16 : 13}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToPlace onChange={onChange} />
        {value && (
          <Marker
            ref={(m) => {
              markerRef.current = m;
            }}
            position={[value.lat, value.lng]}
            draggable
            eventHandlers={{
              dragend(e) {
                const ll = (e.target as LeafletMarker).getLatLng();
                onChange({ lat: ll.lat, lng: ll.lng });
              },
            }}
          />
        )}
        <GpsButton onChange={onChange} />
      </MapContainer>
    </div>
  );
}
