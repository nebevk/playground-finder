import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

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
    },
  ],
  // A production build: `next dev` compiles routes on first hit, which makes parallel
  // tests time out on cold pages. An already-running server on the port is reused locally.
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}/sl`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
