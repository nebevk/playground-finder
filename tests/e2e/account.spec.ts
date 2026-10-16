import { expect, test } from "@playwright/test";
import { E2E_LOGOUT_USER, login, playgroundPath, sl } from "./fixtures";

test("[GDPR-01] signup consent is unchecked by default and required", async ({ page }) => {
  await page.goto("/sl/signup");
  const consent = page.locator('input[name="consent"]');
  await expect(consent).not.toBeChecked();

  await page.locator('input[name="email"]').fill(`nobody+${Date.now()}@example.com`);
  await page.locator('input[name="password"]').fill("secret-123456");
  await page.locator('input[name="age_confirmed"]').check();
  await page.locator('form button[type="submit"]').click();

  // The browser blocks submission on the required checkbox, so we stay on the form.
  expect(await consent.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  await expect(page).toHaveURL(/\/sl\/signup/);
});

test("[FR-ACC-03] a user can log in and log out", async ({ page }) => {
  await login(page, E2E_LOGOUT_USER);
  const logout = page.getByRole("button", { name: sl.profile.logout });
  await logout.click();
  // Logout redirects back to /profile, which then shows the signed-out prompt.
  await expect(page.getByRole("link", { name: sl.profile.loginCta })).toBeVisible();
  await expect(logout).toBeHidden();
});

test("[FR-ADD-02] [FR-ADD-05] [GDPR-07] add a playground in three steps", async ({ page }) => {
  await login(page);
  await page.goto("/sl/add");

  // Step 1: pin the location by tapping the map.
  const map = page.locator(".leaflet-container").first();
  await expect(map).toBeVisible();
  await map.click({ position: { x: 150, y: 120 } });
  await page.getByRole("button", { name: sl.add.next }).click();

  // Step 2: details.
  const name = `E2E igrišče ${Date.now()}`;
  await page.getByPlaceholder(sl.add.step2.namePlaceholder).fill(name);
  await page.getByRole("button", { name: sl.add.next }).click();

  // Step 3: photos, with the children's-faces disclaimer.
  await expect(page.getByText(sl.add.step3.disclaimer)).toBeVisible();
  await page.getByRole("button", { name: sl.add.submit }).click();

  // Lands on the map focused on the new playground.
  await expect(page).toHaveURL(/\/sl\/map/);
  await expect(page.getByRole("dialog").getByText(name)).toBeVisible();
});

test("[FR-COM-04] a signed-in user can report a playground, with a privacy-violation reason", async ({ page }) => {
  await login(page);
  await page.goto(await playgroundPath());

  await page.getByRole("button", { name: sl.detail.report }).first().click();
  await expect(page.getByText(sl.detail.reportReasons.privacy_violation)).toBeVisible();
});

// Known gaps (backlog BL-12, BL-14).
test.fixme("[FR-COM-04] the first (hero) photo has a Report button", async () => {});
test.fixme("[FR-COM-02] a user can edit their own review", async () => {});
