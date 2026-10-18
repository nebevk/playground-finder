"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/Toast/ToastProvider";
import { haversineMeters } from "@/lib/geo";

export type UserPosition = { lat: number; lng: number; accuracy: number };

type UserLocationValue = {
  position: UserPosition | null;
  locating: boolean;
  /** Asks the browser for the position; explains failures with a toast unless `quiet`. */
  locate: (options?: { quiet?: boolean }) => Promise<UserPosition | null>;
  /** Metres from the visitor to a point, or null before they've shared their location. */
  distanceTo: (lat: number, lng: number) => number | null;
};

const UserLocationContext = createContext<UserLocationValue | null>(null);

// The visitor's position lives only in this React state: it's used in the browser to move the
// map and compute distances, and is never stored or sent anywhere (GDPR-13). Shared across
// pages because the provider sits in the locale layout.
export function UserLocationProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("map");
  const { showToast } = useToast();
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [locating, setLocating] = useState(false);

  const locate = useCallback((options?: { quiet?: boolean }) => {
    if (!("geolocation" in navigator)) {
      if (!options?.quiet) showToast(t("locateUnavailable"), "error");
      return Promise.resolve(null);
    }
    setLocating(true);
    return new Promise<UserPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
          setPosition(next);
          setLocating(false);
          resolve(next);
        },
        (err) => {
          setLocating(false);
          if (!options?.quiet) {
            showToast(err.code === err.PERMISSION_DENIED ? t("locateDenied") : t("locateUnavailable"), "error", 6000);
          }
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      );
    });
  }, [showToast, t]);

  const distanceTo = useCallback(
    (lat: number, lng: number) => (position ? haversineMeters(position.lat, position.lng, lat, lng) : null),
    [position],
  );

  const value = useMemo(() => ({ position, locating, locate, distanceTo }), [position, locating, locate, distanceTo]);
  return <UserLocationContext.Provider value={value}>{children}</UserLocationContext.Provider>;
}

export function useUserLocation(): UserLocationValue {
  const ctx = useContext(UserLocationContext);
  if (!ctx) throw new Error("useUserLocation must be used inside <UserLocationProvider>");
  return ctx;
}
