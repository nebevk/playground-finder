"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
/** Tokens last 5 minutes; when the page comes back into view with one this old, get a new one. */
const STALE_AFTER_MS = 4 * 60 * 1000;

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

// Cloudflare Turnstile (NFR-SEC-02). The widget puts its token in a hidden `cf-turnstile-response`
// input inside the form, which the Server Action checks (src/lib/turnstile.ts). Rendered explicitly
// on every mount: the implicit mode draws widgets only once, when the script first loads, so a form
// reached by in-app navigation (or a form step shown again) used to have no widget and no token.
// A token is single-use and expires, so the widget gets a fresh one whenever `resetKey` changes
// (pass the form's action state: any answer from the server has used the token up) and when the
// page comes back into view with an old one, after taking a photo with the camera app, say.
export function Turnstile({ resetKey }: { resetKey?: unknown }) {
  const t = useTranslations("turnstile");
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const issuedAt = useRef(0);
  // The script's onReady runs once it has loaded, and again on every later mount.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const api = window.turnstile;
    if (!siteKey || !ready || !api || !container.current) return;
    const id = api.render(container.current, {
      sitekey: siteKey,
      theme: "light",
      "refresh-expired": "auto",
      callback: () => {
        issuedAt.current = Date.now();
      },
    });
    widget.current = id;
    return () => {
      api.remove(id);
      widget.current = null;
    };
  }, [siteKey, ready]);

  const lastResetKey = useRef(resetKey);
  useEffect(() => {
    if (lastResetKey.current === resetKey) return;
    lastResetKey.current = resetKey;
    if (widget.current) window.turnstile?.reset(widget.current);
  }, [resetKey]);

  useEffect(() => {
    const onVisible = () => {
      const stale = issuedAt.current > 0 && Date.now() - issuedAt.current > STALE_AFTER_MS;
      if (document.visibilityState === "visible" && stale && widget.current) {
        issuedAt.current = 0;
        window.turnstile?.reset(widget.current);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  if (!siteKey) {
    if (process.env.NODE_ENV === "production") return null;
    return (
      <div role="note" className="alert alert-warning alert-soft text-xs">
        {t("notConfigured")}
      </div>
    );
  }

  return (
    <>
      <Script src={TURNSTILE_SRC} onReady={() => setReady(true)} />
      <div ref={container} />
    </>
  );
}
