"use client";

import { memo, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  AttributionControl,
  CircleMarker,
  MapContainer,
  Marker,
  Pane,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { Minus, Plus } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { fixLeafletDefaultIcons } from "@/components/Map/fix-leaflet-icons";
import {
  BRAND,
  activeMarkerIcon,
  clusterIcon,
  compactMarkerIcon,
  playgroundMarkerIcon,
  rankedMarkerIcon,
  smallClusterIcon,
} from "@/components/Map/playground-marker";
import { OSM_ATTRIBUTION, OSM_ATTRIBUTION_TEXT, OSM_TILE_URL } from "@/components/Map/tiles";
import type { MapPlayground } from "@/lib/playground-types";

fixLeafletDefaultIcons();

const LJUBLJANA: [number, number] = [46.0569, 14.5058];

/** The list row being hovered or focused, or the pin being hovered (`from: "map"`). */
export type HomeMapActive = { id: string; from: "pointer" | "focus" | "map" } | null;

export type HomeMapProps = {
  /** "panel": the full-height desktop map. "teaser": the still picture inside the phone link. */
  variant: "panel" | "teaser";
  points: MapPlayground[];
  /** The visitor's position once shared; never leaves the browser (GDPR-13). */
  user: { lat: number; lng: number } | null;
  /** "V bližini", nearest first: these pins are numbered and framed with the visitor. */
  nearestIds: readonly string[];
  active?: HomeMapActive;
  onHover?: (id: string | null) => void;
  onOpen?: (id: string) => void;
};

// Room around framed pins: at the top for the pin heads (and the panel's "Razišči zemljevid"
// link), on the right for the panel's zoom buttons.
const PADDING = {
  panel: { paddingTopLeft: L.point(48, 112), paddingBottomRight: L.point(72, 48) },
  teaser: { paddingTopLeft: L.point(16, 52), paddingBottomRight: L.point(16, 16) },
} as const;

// Panning a row's pin into view: wider at the sides, so the name label centred above the pin
// (up to ~240 px for a long name) isn't cut off by the map's edge.
const FOLLOW_PADDING = { paddingTopLeft: L.point(130, 112), paddingBottomRight: L.point(130, 56) } as const;

// Frames every pin, or the visitor plus the "V bližini" pins once located; never animated (one
// jump, no tiles for the zoom levels in between). Re-frames when the container changes size,
// unless the visitor has moved the map since.
function FrameView({ variant, points, user, nearestIds }: Pick<HomeMapProps, "variant" | "points" | "user" | "nearestIds">) {
  const map = useMap();
  const moved = useRef(false);
  const fitting = useRef(false);

  useMapEvents({
    dragstart: () => {
      moved.current = true;
    },
    zoomstart: () => {
      if (!fitting.current) moved.current = true;
    },
  });

  useEffect(() => {
    moved.current = false;
    const frame = () => {
      fitting.current = true;
      const padding = PADDING[variant];
      const byId = new Map(points.map((p) => [p.id, p]));
      const nearest = nearestIds.flatMap((id) => byId.get(id) ?? []);
      if (user && nearest.length > 0) {
        const bounds = L.latLngBounds([[user.lat, user.lng], ...nearest.map((p): [number, number] => [p.lat, p.lng])]);
        map.fitBounds(bounds, { ...padding, maxZoom: 15, animate: false });
      } else if (points.length === 0) {
        map.setView(user ? [user.lat, user.lng] : LJUBLJANA, user ? 13 : 11, { animate: false });
      } else if (points.length === 1) {
        map.setView([points[0].lat, points[0].lng], 14, { animate: false });
      } else {
        const bounds = L.latLngBounds(points.map((p): [number, number] => [p.lat, p.lng]));
        map.fitBounds(bounds, { ...padding, maxZoom: 14, animate: false });
      }
      fitting.current = false;
    };
    frame();

    let size = map.getSize();
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false, pan: false });
      const next = map.getSize();
      if (next.equals(size)) return;
      size = next;
      if (!moved.current) frame();
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, variant, points, user, nearestIds]);

  return null;
}

// Every pin. The ones not in "V bližini" live in their own pane, so once the visitor has located
// they (and their clusters) can step back to 40 % with one CSS rule; the numbered ones stay in
// Leaflet's marker pane, above them and never clustered.
const PinsLayer = memo(function PinsLayer({
  variant,
  points,
  nearestIds,
  onHover,
  onOpen,
}: Pick<HomeMapProps, "variant" | "points" | "nearestIds" | "onHover" | "onOpen">) {
  const panel = variant === "panel";
  const ranked = new Set(nearestIds);
  const byId = new Map(points.map((p) => [p.id, p]));
  // Pins open their playground; the list beside the map has the same links for keyboards.
  const handlers = (id: string) =>
    panel
      ? { click: () => onOpen?.(id), mouseover: () => onHover?.(id), mouseout: () => onHover?.(null) }
      : undefined;

  return (
    <>
      <Pane name="home-others" style={{ zIndex: 590 }}>
        <MarkerClusterGroup
          clusterPane="home-others"
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom={panel}
          // About one pin wide: only pins that would overlap merge.
          maxClusterRadius={panel ? 30 : 16}
          iconCreateFunction={panel ? clusterIcon : smallClusterIcon}
        >
          {points
            .filter((p) => !ranked.has(p.id))
            .map((p) => (
              <Marker
                key={p.id}
                position={[p.lat, p.lng]}
                icon={panel ? playgroundMarkerIcon : compactMarkerIcon}
                keyboard={false}
                interactive={panel}
                eventHandlers={handlers(p.id)}
              />
            ))}
        </MarkerClusterGroup>
      </Pane>
      {nearestIds.map((id, i) => {
        const p = byId.get(id);
        if (!p) return null;
        return (
          <Marker
            key={`ranked-${id}`}
            position={[p.lat, p.lng]}
            icon={rankedMarkerIcon(i + 1, panel ? "md" : "sm")}
            zIndexOffset={1000 - i}
            keyboard={false}
            interactive={panel}
            eventHandlers={handlers(id)}
          />
        );
      })}
    </>
  );
});

// The hovered or focused row's pin, enlarged and labelled with its name. Not interactive, so it
// never takes the hover away from the pin underneath; above clusters too, so a row whose pin is
// clustered still lights up.
function ActivePin({ points, nearestIds, active }: Pick<HomeMapProps, "points" | "nearestIds" | "active">) {
  if (!active) return null;
  const p = points.find((x) => x.id === active.id);
  if (!p) return null;
  const rank = nearestIds.indexOf(p.id);
  return (
    <Marker
      position={[p.lat, p.lng]}
      icon={activeMarkerIcon(rank >= 0 ? rank + 1 : undefined)}
      zIndexOffset={2000}
      interactive={false}
      keyboard={false}
    >
      <Tooltip permanent direction="top" offset={[0, -62]} opacity={1} className="home-map-label">
        {p.name}
      </Tooltip>
    </Marker>
  );
}

// Brings the active row's pin into view: at once for keyboard focus; after 300 ms for a mouse,
// so a pointer sweeping down the list doesn't drag the map along.
function FollowActive({ points, active }: Pick<HomeMapProps, "points" | "active">) {
  const map = useMap();
  useEffect(() => {
    if (!active || active.from === "map") return;
    const p = points.find((x) => x.id === active.id);
    if (!p) return;
    const pan = () =>
      map.panInside([p.lat, p.lng], {
        ...FOLLOW_PADDING,
        animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      });
    if (active.from === "focus") {
      pan();
      return;
    }
    const timer = window.setTimeout(pan, 300);
    return () => window.clearTimeout(timer);
  }, [map, points, active]);
  return null;
}

// "You are here": a dot with a soft halo, in a pane above every pin (below the label).
function UserDot({ user, variant }: Pick<HomeMapProps, "user" | "variant">) {
  if (!user) return null;
  const panel = variant === "panel";
  return (
    <Pane name="home-user" style={{ zIndex: 640 }}>
      <CircleMarker
        center={[user.lat, user.lng]}
        radius={panel ? 24 : 16}
        interactive={false}
        pathOptions={{ stroke: false, fillColor: BRAND.primary, fillOpacity: 0.2 }}
      />
      <CircleMarker
        center={[user.lat, user.lng]}
        radius={panel ? 9 : 7}
        interactive={false}
        pathOptions={{ color: "white", weight: panel ? 3 : 2.5, fillColor: BRAND.primary, fillOpacity: 1 }}
      />
    </Pane>
  );
}

// Zoom buttons like /map's (44 px). A press on them must not reach the map, or a double-click
// on + would also zoom the map, and a press could start a drag.
function ZoomButtons() {
  const map = useMap();
  const t = useTranslations("map");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    L.DomEvent.disableClickPropagation(ref.current);
    L.DomEvent.disableScrollPropagation(ref.current);
  }, []);
  return (
    <div ref={ref} className="absolute right-4 bottom-8 z-1000 join join-vertical rounded-full bg-base-100 shadow-md">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        aria-label={t("zoomIn")}
        className="btn btn-ghost join-item btn-square rounded-t-full"
      >
        <Plus className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        aria-label={t("zoomOut")}
        className="btn btn-ghost join-item btn-square rounded-b-full"
      >
        <Minus className="size-5" aria-hidden />
      </button>
    </div>
  );
}

// Home's one Leaflet map, in two variants:
// - panel (lg+): full height beside the list. It can be dragged, pinched and zoomed (not with the
//   scroll wheel, so the page never scroll-jacks); pins open their playground and answer the list.
// - teaser (phones, md): a still picture inside the link to /map, with smaller pins.
// The basemap is muted so the pins and the list lead. Never animated: the teaser is a picture,
// and the panel re-frames in one jump.
export function HomeMap({ variant, points, user, nearestIds, active = null, onHover, onOpen }: HomeMapProps) {
  const panel = variant === "panel";
  return (
    <MapContainer
      center={LJUBLJANA}
      zoom={12}
      zoomControl={false}
      attributionControl={false}
      keyboard={false}
      boxZoom={false}
      scrollWheelZoom={false}
      dragging={panel}
      touchZoom={panel}
      doubleClickZoom={panel}
      fadeAnimation={panel}
      zoomAnimation={panel}
      markerZoomAnimation={panel}
      // Transparent, so the map-land placeholder behind shows under loading tiles (no grey flash).
      className="h-full w-full bg-transparent! font-sans! [&_.leaflet-tile-pane]:saturate-50"
    >
      <AttributionControl position="bottomright" prefix={false} />
      <TileLayer url={OSM_TILE_URL} attribution={panel ? OSM_ATTRIBUTION : OSM_ATTRIBUTION_TEXT} />
      <PinsLayer variant={variant} points={points} nearestIds={nearestIds} onHover={onHover} onOpen={onOpen} />
      {panel && <ActivePin points={points} nearestIds={nearestIds} active={active} />}
      <UserDot user={user} variant={variant} />
      <FrameView variant={variant} points={points} user={user} nearestIds={nearestIds} />
      {panel && <FollowActive points={points} active={active} />}
      {panel && <ZoomButtons />}
    </MapContainer>
  );
}
