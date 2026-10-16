// Browser error tracking. Without NEXT_PUBLIC_SENTRY_DSN the SDK is never downloaded; with it,
// it loads lazily after the page, keeping it off the critical path for phones.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void import("@/lib/sentry-client").then(({ startSentry }) => startSentry());
}
