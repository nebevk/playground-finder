"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, AttributionControl, Circle, CircleMarker, Tooltip } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useTranslations } from "next-intl";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { fixLeafletDefaultIcons } from "./fix-leaflet-icons";
import { clusterIcon, playgroundMarkerIcon, selectedMarkerIcon } from "./playground-marker";
import { MapControls } from "./MapControls";
import { PlaygroundSheet } from "./PlaygroundSheet";
import { WelcomeChip } from "./WelcomeChip";
import { useUserLocation } from "@/components/Location/UserLocationContext";
import type { MapPlayground } from "@/lib/playgrounds";

fixLeafletDefaultIcons();

const LJUBLJANA: [number, number] = [46.0569, 14.5058];
const DEFAULT_ZOOM = 13;
const CONTROLS_GAP = 16;

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

// Keeps the selected pin visible above the sheet: centres the map on a point half a sheet
// below the pin. Tapping the map background closes the sheet.
function SheetSync({
  selected,
  sheetHeight,
  onBackgroundTap,
}: {
  selected: MapPlayground | null;
  sheetHeight: number;
  onBackgroundTap: () => void;
}) {
  const map = useMap();
  useMapEvents({ click: onBackgroundTap });
  useEffect(() => {
    if (!selected || sheetHeight === 0) return;
    const pin = map.project([selected.lat, selected.lng]);
    map.panTo(map.unproject(pin.add([0, sheetHeight / 2])), { animate: true });
  }, [selected, sheetHeight, map]);
  return null;
}

// "You are here": a dot plus the accuracy circle, once the visitor has shared their location.
function UserLocationLayer() {
  const t = useTranslations("map");
  const { position } = useUserLocation();
  if (!position) return null;
  const center: [number, number] = [position.lat, position.lng];
  return (
    <>
      <Circle
        center={center}
        radius={position.accuracy}
        pathOptions={{ color: "oklch(57% 0.22 300)", weight: 1, fillOpacity: 0.12 }}
        interactive={false}
      />
      <CircleMarker
        center={center}
        radius={8}
        pathOptions={{ color: "white", weight: 3, fillColor: "oklch(57% 0.22 300)", fillOpacity: 1 }}
      >
        <Tooltip>{t("youAreHere")}</Tooltip>
      </CircleMarker>
    </>
  );
}

export function PlaygroundMap({
  playgrounds,
  focusId = null,
}: {
  playgrounds: MapPlayground[];
  focusId?: string | null;
}) {
  const [selected, setSelected] = useState<MapPlayground | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const close = useCallback(() => setSelected(null), []);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={LJUBLJANA}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
      >
        {/* Top-right: the bottom corners hold the Filtri, zoom and locate controls. */}
        <AttributionControl position="topright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup chunkedLoading iconCreateFunction={clusterIcon}>
          {playgrounds.map((p) => (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={selected?.id === p.id ? selectedMarkerIcon : playgroundMarkerIcon}
              // Accessible name for the (keyboard-focusable) pin.
              title={p.name}
              zIndexOffset={selected?.id === p.id ? 1000 : 0}
              eventHandlers={{ click: () => setSelected(p) }}
            />
          ))}
        </MarkerClusterGroup>
        <UserLocationLayer />
        <MapControls bottom={selected ? sheetHeight + CONTROLS_GAP : CONTROLS_GAP} />
        <SheetSync selected={selected} sheetHeight={sheetHeight} onBackgroundTap={close} />
        <FocusOnAdded playgrounds={playgrounds} focusId={focusId} onFocus={setSelected} />
      </MapContainer>

      <WelcomeChip dismissed={selected !== null} />
      <PlaygroundSheet playground={selected} onClose={close} onHeight={setSheetHeight} />
    </div>
  );
}
