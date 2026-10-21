// The Content-Security-Policy (NFR-SEC-03), built for each request with that request's nonce.
// Scripts run only if they carry the nonce (Next adds it to its own); 'strict-dynamic' lets those
// load what they need (Turnstile, the analytics scripts, code chunks). Everything else comes from
// the app itself or from these origins.
const TILES = "https://tile.openstreetmap.org";
const TURNSTILE = "https://challenges.cloudflare.com";
const SIMPLE_ANALYTICS_QUEUE = "https://queue.simpleanalyticscdn.com";

export function contentSecurityPolicy(nonce: string, env: Record<string, string | undefined> = process.env): string {
  const supabase = originOf(env.NEXT_PUBLIC_SUPABASE_URL);
  const sentry = originOf(env.NEXT_PUBLIC_SENTRY_DSN);
  const directives: Record<string, (string | null)[]> = {
    "default-src": ["'self'"],
    // React needs eval in development only, for its debugging tools.
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", env.NODE_ENV === "development" ? "'unsafe-eval'" : null],
    // Inline styles: React's style props, Leaflet's positioning and next/font.
    "style-src": ["'self'", "'unsafe-inline'"],
    // Map tiles, playground photos (signed Storage URLs), photos being picked (blob:), analytics.
    "img-src": ["'self'", "data:", "blob:", TILES, supabase, SIMPLE_ANALYTICS_QUEUE],
    "font-src": ["'self'"],
    "connect-src": ["'self'", supabase, SIMPLE_ANALYTICS_QUEUE, TURNSTILE, sentry],
    "frame-src": [TURNSTILE],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const policy = Object.entries(directives).map(([name, values]) => [name, ...values.filter(Boolean)].join(" "));
  // Not with the local, plain-http Supabase stack: it would turn those requests into https.
  if (supabase?.startsWith("https:")) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

function originOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}
