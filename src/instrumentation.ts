import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

// Server-side error tracking (Node.js and Edge runtimes alike). No-op without a DSN.
export async function register() {
  Sentry.init(sentryOptions());
}

// Errors in Server Components, Route Handlers, Server Actions and the proxy.
export const onRequestError = Sentry.captureRequestError;
