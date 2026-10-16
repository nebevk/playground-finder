import { expect, test, type Page } from "@playwright/test";
import { E2E_RESET_USER, emailLink, sl } from "./fixtures";

// One worker at a time: both tests change the same account's password.
test.describe.configure({ mode: "serial" });

async function requestReset(page: Page) {
  const since = new Date(Date.now() - 1_000);
  await page.goto("/sl/forgot-password");
  await page.locator('input[name="email"]').fill(E2E_RESET_USER.email);
  await page.getByRole("button", { name: sl.auth.submitForgot }).click();
  await expect(page.getByText(sl.auth.resetEmailSent)).toBeVisible();
  return emailLink(E2E_RESET_USER.email, since);
}

async function setNewPassword(page: Page) {
  await expect(page).toHaveURL(/\/sl\/reset-password/);
  await expect(page.getByRole("heading", { name: sl.auth.resetTitle })).toBeVisible();
  // Supabase rejects a new password equal to the current one, so use a fresh one each time.
  const fresh = `${E2E_RESET_USER.password}-${Date.now()}`;
  await page.locator('input[name="password"]').fill(fresh);
  await page.locator('input[name="confirm"]').fill(fresh);
  await page.getByRole("button", { name: sl.auth.submitReset }).click();
  await expect(page).toHaveURL(/\/sl\/profile/, { timeout: 20_000 });
}

test("[FR-ACC-04] the reset link opened in the same browser lets the user set a new password", async ({ page }) => {
  const link = await requestReset(page);
  await page.goto(link);
  await setNewPassword(page);
});

test("[FR-ACC-04] the reset link also works in another browser (email app, other device)", async ({ page, browser }) => {
  const link = await requestReset(page);
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto(link);
  await setNewPassword(otherPage);
  await other.close();
});

test("[FR-ACC-04] a link scanner opening the link first doesn't use it up", async ({ page, request }) => {
  const link = await requestReset(page);
  // Like Outlook Safe Links or a mail app's preview fetching the link before the user taps it.
  expect((await request.get(link)).ok()).toBe(true);
  await page.goto(link);
  await setNewPassword(page);
});

test("[FR-ACC-04] an invalid or used reset link says so", async ({ page }) => {
  await page.goto("/sl/reset-password?token_hash=not-a-real-token&type=recovery");
  await page.locator('input[name="password"]').fill("whatever-123");
  await page.locator('input[name="confirm"]').fill("whatever-123");
  await page.getByRole("button", { name: sl.auth.submitReset }).click();
  await expect(page.getByText(sl.auth.resetLinkInvalid)).toBeVisible();
});

test("[FR-ACC-02] [FR-ACC-04] an unusable email link explains itself instead of a silent login page", async ({ page }) => {
  await page.goto("/sl/auth/callback?code=not-a-real-code");
  await expect(page).toHaveURL(/\/sl\/login\?error=link_invalid/);
  await expect(page.getByText(sl.auth.linkInvalid)).toBeVisible();
});
