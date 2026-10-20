import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { SENTRY_SINK } from "./tests/e2e/sentry-sink";

// Same env as `pnpm dev`; global-setup refuses to run against a non-local Supabase.
loadEnv({ path: ".env.local" });

const PORT = 3000;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  // The default (half the cores) starts up to 8 browsers next to Docker's VM and the
  // Next server; on a typical dev laptop that swaps and pages time out.
  workers: process.env.CI ? 2 : 3,
  // Most tests are whole journeys (sign in → act → verify) against a production build; under
  // parallel load they can exceed the 30 s default without anything being wrong.
  timeout: 60_000,
  // Pages stream from several sequential Supabase calls; 5 s is tight on a busy laptop.
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "sl-SI",
    trace: "retain-on-failure",
    // Cookie notice already acknowledged: it appears after hydration and covers bottom
    // controls at 375 px. The GDPR-12 test opts out to check the first-visit behaviour.
    storageState: {
      cookies: [],
      origins: [
        { origin: `http://localhost:${PORT}`, localStorage: [{ name: "pf-cookies-ack-v1", value: "1" }] },
      ],
    },
  },
  projects: [
    {
      // Mobile-first: the 375 px baseline from NFR-UX-01.
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } },
      testIgnore: /\.desktop\.spec\.ts$/,
    },
    {
      // Desktop-only layouts (Home's list + map split view), in *.desktop.spec.ts files.
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      testMatch: /\.desktop\.spec\.ts$/,
    },
  ],
  // A production build: `next dev` compiles routes on first hit, which makes parallel
  // tests time out on cold pages. An already-running server on the port is reused locally.
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}/sl`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    // Error reports go to the local stand-in for Sentry (tests/e2e/sentry-sink.ts).
    env: {
      ...(Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined)) as Record<string, string>),
      NEXT_PUBLIC_SENTRY_DSN: SENTRY_SINK.dsn,
    },
  },
});
