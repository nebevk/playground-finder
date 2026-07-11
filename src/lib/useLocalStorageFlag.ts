"use client";

import { useCallback, useSyncExternalStore } from "react";

// Same-tab notifications: localStorage.setItem does not fire the "storage"
// event in the tab that wrote it, so we keep our own listener set.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// Boolean "seen/acknowledged" flag persisted in localStorage, exposed as a
// React external store so components can read it without setState-in-effect.
// On the server (and when localStorage is unavailable) it reads as `true`,
// i.e. already acknowledged, so nothing flashes during SSR.
export function useLocalStorageFlag(key: string): readonly [boolean, () => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) === "1";
      } catch {
        return true;
      }
    },
    () => true,
  );

  const setFlag = useCallback(() => {
    try {
      localStorage.setItem(key, "1");
    } catch {
      // ignore — flag simply won't persist
    }
    for (const l of listeners) l();
  }, [key]);

  return [value, setFlag] as const;
}
