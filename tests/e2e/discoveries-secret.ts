// The discoveries API's secret for the e2e server (playwright.config.ts) and its tests. A test-only
// value: production's DISCOVERY_SECRET lives in Vercel, never in git.
export const E2E_DISCOVERY_SECRET = "e2e-discovery-secret-not-for-production-0123456789";
