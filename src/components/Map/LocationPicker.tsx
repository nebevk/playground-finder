"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import { LocateFixed } from "lucide-react";
import { useTranslations } from "next-intl";
import "leaflet/dist/leaflet.css";
import { useUserLocation } from "@/components/Location/UserLocationContext";
import { fixLeafletDefaultIcons } from "./fix-leaflet-icons";
import { BRAND, playgroundMarkerIcon } from "./playground-marker";
import { OSM_ATTRIBUTION, OSM_TILE_URL } from "./tiles";

fixLeafletDefaultIcons();

const LJUBLJANA: [number, number] = [46.0569, 14.5058];

type LatLng = { lat: number; lng: number };
export type ExistingPlayground = { id: string; name: string; lat: number; lng: number };

function ClickToPlace({ onChange }: { onChange: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function GpsButton({ onChange, onError }: { onChange: (pos: LatLng) => void; onError: () => void }) {
  const map = useMap();
  const t = useTranslations("map");
  const { locate, locating } = useUserLocation();

  async function handle() {
    // Quiet: this step explains a failure inline, with what to do instead.
    const pos = await locate({ quiet: true });
    if (!pos) return onError();
    onChange({ lat: pos.lat, lng: pos.lng });
    map.setView([pos.lat, pos.lng], 16);
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={locating}
      aria-label={t("useMyLocation")}
      className="btn btn-circle btn-lg btn-primary absolute right-3 bottom-3 z-1000 shadow-lg"
    >
      {locating ? (
        <span className="loading loading-spinner loading-sm" aria-hidden />
      ) : (
        <LocateFixed className="size-6" aria-hidden />
      )}
    </button>
  );
}

export function LocationPicker({
  value,
  onChange,
  existing = [],
}: {
  value: LatLng | null;
  onChange: (pos: LatLng) => void;
  /** Already-listed playgrounds, shown faded so people don't add duplicates (BL-60). */
  existing?: ExistingPlayground[];
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
          <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
          <ClickToPlace onChange={handleChange} />
          {existing.map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={7}
              interactive={false}
              pathOptions={{ color: BRAND.primary, weight: 2, opacity: 0.6, fillOpacity: 0.25 }}
            />
          ))}
          {value && (
            <Marker
              ref={(m) => {
                markerRef.current = m;
              }}
              position={[value.lat, value.lng]}
              icon={playgroundMarkerIcon}
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
