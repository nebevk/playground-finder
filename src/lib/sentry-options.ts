import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

// Error tracking (NFR-OPS-04). Off unless NEXT_PUBLIC_SENTRY_DSN is set. Privacy:
// - errors only: no performance tracing, and no session replay (it would record screens,
//   including photos of playgrounds and children);
// - no IP addresses, cookies or user identity (sendDefaultPii: false, plus scrubbing below);
// - one-time tokens in URLs (password-reset and confirmation links) never leave the app.

const SECRET_PARAMS = ["token_hash", "token", "code", "access_token", "refresh_token"];

export function scrubUrl(url: string): string {
  try {
    const u = new URL(url, "http://relative.invalid");
    let changed = false;
    for (const p of SECRET_PARAMS) {
      if (u.searchParams.has(p)) {
        u.searchParams.set(p, "[scrubbed]");
        changed = true;
      }
    }
    // Implicit-flow tokens arrive in the fragment (#access_token=…).
    if (/(access_token|refresh_token|token_hash)=/.test(u.hash)) {
      u.hash = "#[scrubbed]";
      changed = true;
    }
    if (!changed) return url;
    return u.origin === "http://relative.invalid" ? `${u.pathname}${u.search}${u.hash}` : u.toString();
  } catch {
    return url;
  }
}

export function scrubBreadcrumb(b: Breadcrumb): Breadcrumb {
  const data = b.data as Record<string, unknown> | undefined;
  if (data) {
    for (const key of ["url", "from", "to"]) {
      if (typeof data[key] === "string") data[key] = scrubUrl(data[key] as string);
    }
  }
  if (b.message) b.message = b.message.replace(/https?:\/\/\S+/g, (m) => scrubUrl(m));
  return b;
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    if (event.request.url) event.request.url = scrubUrl(event.request.url);
    delete event.request.query_string;
    delete event.request.cookies;
    if (event.request.headers) {
      for (const h of Object.keys(event.request.headers)) {
        if (/^(cookie|authorization)$/i.test(h)) delete event.request.headers[h];
      }
    }
  }
  delete event.user;
  for (const b of event.breadcrumbs ?? []) scrubBreadcrumb(b);
  return event;
}

export function sentryOptions() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? "development",
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  };
}
