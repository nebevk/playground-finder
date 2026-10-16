import { expect, test } from "@playwright/test";
import { emailLink, sl } from "./fixtures";

test("[FR-ACC-02] the signup confirmation link works in another browser and signs the user in", async ({
  page,
  browser,
}) => {
  const email = `e2e-signup-${Date.now()}@example.com`;
  const password = "e2e-Password-123";
  const since = new Date(Date.now() - 1_000);

  await page.goto("/sl/signup");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="consent"]').check();
  await page.locator('input[name="age_confirmed"]').check();
  await page.getByRole("button", { name: sl.auth.submitSignup }).click();
  await expect(page.getByText(sl.auth.checkEmail)).toBeVisible({ timeout: 15_000 });

  // Before confirming, logging in says why it can't work yet.
  await page.goto("/sl/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: sl.auth.submitLogin }).click();
  await expect(page.getByText(sl.auth.emailNotConfirmed)).toBeVisible({ timeout: 15_000 });

  // The email is opened somewhere else, like a phone's mail app.
  const link = await emailLink(email, since);
  expect(link).toContain("/auth/confirm?token_hash=");
  const other = await browser.newContext();
  const phone = await other.newPage();
  await phone.goto(link);
  await expect(phone).toHaveURL(/\/sl\/profile\?confirmed=1/);
  await expect(phone.getByText(sl.profile.emailConfirmed)).toBeVisible();
  await other.close();
});

test("[FR-ACC-02] an invalid confirmation link explains itself", async ({ page }) => {
  await page.goto("/sl/auth/confirm?token_hash=not-a-real-token&type=email");
  await expect(page).toHaveURL(/\/sl\/login\?error=link_invalid/);
  await expect(page.getByText(sl.auth.linkInvalid)).toBeVisible();
});
