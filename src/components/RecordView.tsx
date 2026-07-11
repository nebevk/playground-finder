"use client";

import { useEffect, useRef } from "react";
import { recordPlaygroundViewAction } from "@/app/[locale]/playground/[id]/actions";

const STORAGE_KEY = "pf-viewed-v1";

// Playground ids already counted in this browser session, so revisits and
// back-navigation don't inflate the "most popular" ranking.
function alreadyViewed(id: string): boolean {
  try {
    const seen: string[] = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    if (seen.includes(id)) return true;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...seen, id].slice(-200)));
    return false;
  } catch {
    return false;
  }
}

// Records a detail-page view once on mount. Lives in a client effect so prefetching a
// link (which doesn't run client effects) doesn't inflate the counter.
export function RecordView({ id }: { id: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (alreadyViewed(id)) return;
    void recordPlaygroundViewAction(id);
  }, [id]);
  return null;
}
