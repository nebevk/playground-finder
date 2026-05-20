"use client";

import Script from "next/script";
import { useTranslations } from "next-intl";

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export function Turnstile() {
  const t = useTranslations("turnstile");
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

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
      <Script src={TURNSTILE_SRC} async defer />
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" />
    </>
  );
}
