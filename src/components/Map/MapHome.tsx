"use client";

import { useState } from "react";
import { MapClient } from "./MapClient";
import { WelcomeOverlay } from "./WelcomeOverlay";
import type { MapPlayground } from "@/lib/playgrounds";

export function MapHome({
  playgrounds,
  latest,
  popular,
  addedId,
}: {
  playgrounds: MapPlayground[];
  latest: MapPlayground[];
  popular: MapPlayground[];
  addedId: string | null;
}) {
  // The welcome landing is the home experience: it shows whenever you arrive on "/"
  // (site entry, or tapping the logo / Home nav). Tapping "Explore the map" reveals the
  // full map for that visit; navigating home again brings the landing back.
  // Only a successful add (?added) skips straight to the map to celebrate the new pin.
  const [expanded, setExpanded] = useState(addedId != null);

  return (
    <div className="relative h-full w-full">
      {expanded ? (
        <MapClient playgrounds={playgrounds} addedId={addedId} />
      ) : (
        <WelcomeOverlay latest={latest} popular={popular} onExplore={() => setExpanded(true)} />
      )}
    </div>
  );
}
