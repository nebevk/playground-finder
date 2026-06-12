"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import { LocateFixed } from "lucide-react";
import { useTranslations } from "next-intl";
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

function GpsButton({
  onChange,
  onError,
}: {
  onChange: (pos: LatLng) => void;
  onError: () => void;
}) {
  const map = useMap();
  const t = useTranslations("map");
  const [locating, setLocating] = useState(false);

  function handle() {
    if (!("geolocation" in navigator)) {
      onError();
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChange(next);
        map.setView([next.lat, next.lng], 16);
      },
      () => {
        setLocating(false);
        onError();
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={locating}
      aria-label={t("useMyLocation")}
      className="btn btn-circle btn-primary absolute right-3 bottom-3 z-[1000] shadow-lg"
    >
      {locating ? (
        <span className="loading loading-spinner loading-sm" aria-hidden />
      ) : (
        <LocateFixed className="size-5" aria-hidden />
      )}
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
  const t = useTranslations("add.step1");
  const markerRef = useRef<LeafletMarker | null>(null);
  const [gpsFailed, setGpsFailed] = useState(false);

  useEffect(() => {
    const m = markerRef.current;
    if (m && value) m.setLatLng([value.lat, value.lng]);
  }, [value]);

  function handleChange(pos: LatLng) {
    setGpsFailed(false);
    onChange(pos);
  }

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-box border border-base-300">
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
          <ClickToPlace onChange={handleChange} />
          {value && (
            <Marker
              ref={(m) => {
                markerRef.current = m;
              }}
              position={[value.lat, value.lng]}
              draggable
              eventHandlers={{
                dragend(e) {
                  handleChange((e.target as LeafletMarker).getLatLng());
                },
              }}
            />
          )}
          <GpsButton onChange={handleChange} onError={() => setGpsFailed(true)} />
        </MapContainer>
      </div>

      {gpsFailed && (
        <p role="alert" className="text-sm text-error">
          {t("gpsError")}
        </p>
      )}
    </div>
  );
}
