// Canonical public origin of the deployed app.
//
// Priority: explicit NEXT_PUBLIC_SITE_URL, then Vercel's production domain
// (set automatically on every Vercel deployment), then localhost for dev.
// The Vercel fallback prevents auth emails from ever pointing at localhost
// in production when NEXT_PUBLIC_SITE_URL is forgotten.
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

// Public GDPR contact for data requests (GDPR-10). Required on Vercel production builds
// (src/lib/env-checks.ts); elsewhere a clearly fake placeholder so local and preview builds work.
export function getPrivacyEmail(): string {
  return process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() || "privacy@example.invalid";
}
