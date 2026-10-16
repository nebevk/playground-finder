import { expect, test } from "@playwright/test";
import { E2E_ADMIN_USER, login } from "./fixtures";
import { SENTRY_SINK } from "./sentry-sink";

const received = async () => ((await (await fetch(SENTRY_SINK.events)).json()) as string[]).filter((e) => e.includes("Sentry test error"));

test("[NFR-OPS-04] a server error reaches the error tracker, without the one-time token in its URL", async ({ page }) => {
  await login(page, E2E_ADMIN_USER);
  const res = await page.request.get("/sl/admin/sentry-test?token_hash=SECRET-TOKEN-123");
  expect(res.status()).toBe(500);

  await expect.poll(async () => (await received()).length, { timeout: 20_000 }).toBeGreaterThan(0);
  for (const envelope of await received()) {
    expect(envelope).not.toContain("SECRET-TOKEN-123");
    expect(envelope).not.toContain(E2E_ADMIN_USER.email);
  }
});

test("[NFR-OPS-04] the deliberate-error route is a 404 for everyone but admins", async ({ request }) => {
  expect((await request.get("/sl/admin/sentry-test")).status()).toBe(404);
});
