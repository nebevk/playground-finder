// Loaded lazily by instrumentation-client.ts, only when a DSN is configured. Named imports
// (not `import * as Sentry`) let the bundler drop what we don't use: replay and tracing.
import { init } from "@sentry/nextjs";
import { sentryOptions } from "./sentry-options";

export function startSentry() {
  init(sentryOptions());
}
