"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { LocateFixed } from "lucide-react";
import { useTranslations } from "next-intl";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { fixLeafletDefaultIcons } from "./fix-leaflet-icons";
import { playgroundMarkerIcon } from "./playground-marker";
import { PlaygroundSheet } from "./PlaygroundSheet";
import { WelcomeChip } from "./WelcomeChip";
import type { MapPlayground } from "@/lib/playgrounds";

fixLeafletDefaultIcons();

const LJUBLJANA: [number, number] = [46.0569, 14.5058];
const DEFAULT_ZOOM = 13;

function LocateButton() {
  const map = useMap();
  const t = useTranslations("map");

  function handleLocate() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 15),
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <button
      type="button"
      onClick={handleLocate}
      aria-label={t("locateMe")}
      className="btn btn-circle btn-primary absolute right-4 bottom-4 z-[1000] shadow-lg"
    >
      <LocateFixed className="size-5" aria-hidden />
    </button>
  );
}

// Pans to a just-added playground and opens its sheet, once.
function FocusOnAdded({
  playgrounds,
  focusId,
  onFocus,
}: {
  playgrounds: MapPlayground[];
  focusId: string | null;
  onFocus: (p: MapPlayground) => void;
}) {
  const map = useMap();
  const done = useRef(false);

  useEffect(() => {
    if (!focusId || done.current) return;
    const target = playgrounds.find((p) => p.id === focusId);
    if (!target) return;
    done.current = true;
    map.flyTo([target.lat, target.lng], 16, { duration: 1.2 });
    onFocus(target);
  }, [focusId, playgrounds, map, onFocus]);

  return null;
}

export function PlaygroundMap({
  playgrounds,
  focusId = null,
}: {
  playgrounds: MapPlayground[];
  focusId?: string | null;
}) {
  const [selected, setSelected] = useState<MapPlayground | null>(null);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={LJUBLJANA}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup chunkedLoading>
          {playgrounds.map((p) => (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={playgroundMarkerIcon}
              eventHandlers={{ click: () => setSelected(p) }}
            />
          ))}
        </MarkerClusterGroup>
        <LocateButton />
        <FocusOnAdded playgrounds={playgrounds} focusId={focusId} onFocus={setSelected} />
      </MapContainer>

      <WelcomeChip dismissed={selected !== null} />
      <PlaygroundSheet playground={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
