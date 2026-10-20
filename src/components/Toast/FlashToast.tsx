"use client";

import { useEffect, useRef } from "react";
import { useToast } from "./ToastProvider";

// A one-off toast after a redirect (e.g. "?updated=1"). It then drops the query from the URL, so
// a refresh doesn't show it again.
export function FlashToast({ message }: { message: string }) {
  const { showToast } = useToast();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    showToast(message, "success");
    window.history.replaceState(null, "", window.location.pathname);
  }, [message, showToast]);

  return null;
}
