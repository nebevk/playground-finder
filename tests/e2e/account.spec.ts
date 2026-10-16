import { expect, test } from "@playwright/test";
import { E2E_LOGOUT_USER, login, noisePng, playgroundPath, sl } from "./fixtures";

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
  await expect(page.getByRole("link", { name: sl.profile.loginCta })).toBeVisible({ timeout: 15_000 });
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
  await expect(page).toHaveURL(/\/sl\/map/, { timeout: 20_000 });
  await expect(page.getByRole("dialog").getByText(name)).toBeVisible();
});

// 1×1 PNG: small enough to upload unchanged, real enough for the image pipeline.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

test("[FR-ADD-03] [FR-ADD-04] [FR-COM-06] [GDPR-16] a verified user's photo is uploaded and shown on the playground", async ({ page, browser }) => {
  // Long journey (login → add → upload → map → detail → anonymous visit): more than the default 30 s under load.
  test.setTimeout(60_000);
  await login(page);
  await page.goto("/sl/add");

  await page.locator(".leaflet-container").first().click({ position: { x: 160, y: 140 } });
  await page.getByRole("button", { name: sl.add.next }).click();
  const name = `E2E foto ${Date.now()}`;
  await page.getByPlaceholder(sl.add.step2.namePlaceholder).fill(name);
  await page.getByRole("button", { name: sl.add.next }).click();

  // Goes through the real Storage upload under the database's insert policies.
  await page.locator('input[type="file"][multiple]').setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: sl.add.submit }).click();

  await expect(page).toHaveURL(/\/sl\/map/, { timeout: 20_000 });
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText(name)).toBeVisible();
  await sheet.locator('a[href*="/playground/"]').first().click();
  // Private bucket: shown through a short-lived signed URL, not a public one.
  const img = page.locator('img[src*="playground-photos"]').first();
  await expect(img).toBeVisible();
  await expect(img).toHaveAttribute("src", /\/object\/sign\/playground-photos\/.+\?token=/);
  // Never offered to link previews (GDPR-16).
  await expect(page.locator('meta[property="og:image"][content*="playground-photos"]')).toHaveCount(0);

  // Anonymous visitors get a signed URL too (signed under the anon role's storage policy).
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto(page.url());
  await expect(anonPage.locator('img[src*="/object/sign/playground-photos/"]').first()).toBeVisible();
  await anon.close();
});

test("[FR-ADD-03] several real-size photos can be added in one submission", async ({ page }) => {
  await login(page);
  await page.goto("/sl/add");
  await page.locator(".leaflet-container").first().click({ position: { x: 170, y: 150 } });
  await page.getByRole("button", { name: sl.add.next }).click();
  const name = `E2E 4 fotografije ${Date.now()}`;
  await page.getByPlaceholder(sl.add.step2.namePlaceholder).fill(name);
  await page.getByRole("button", { name: sl.add.next }).click();

  // Four ~360 KB photos (~1.4 MB in total), each within the per-photo rules.
  const files = Array.from({ length: 4 }, (_, i) => ({
    name: `p${i}.png`,
    mimeType: "image/png",
    buffer: noisePng(400, 300),
  }));
  await page.locator('input[type="file"][multiple]').setInputFiles(files);
  await page.getByRole("button", { name: sl.add.submit }).click();

  await expect(page).toHaveURL(/\/sl\/map/, { timeout: 20_000 });
  await expect(page.getByRole("dialog").getByText(name)).toBeVisible();
});

test("[FR-ADD-03] all 8 photos fit one submission, even large ones", async ({ page }) => {
  // 8 photos × several encode attempts each: more than the default 30 s under load.
  test.setTimeout(120_000);
  await login(page);
  await page.goto("/sl/add");
  await page.locator(".leaflet-container").first().click({ position: { x: 180, y: 160 } });
  await page.getByRole("button", { name: sl.add.next }).click();
  const name = `E2E 8 fotografij ${Date.now()}`;
  await page.getByPlaceholder(sl.add.step2.namePlaceholder).fill(name);
  await page.getByRole("button", { name: sl.add.next }).click();

  // Random noise is the worst case for compression (real photos shrink far more easily).
  const files = Array.from({ length: 8 }, (_, i) => ({
    name: `big${i}.png`,
    mimeType: "image/png",
    buffer: noisePng(1200, 900),
  }));
  await page.locator('input[type="file"][multiple]').setInputFiles(files);
  await expect(page.getByText(sl.add.step3.selected.replace("{count}", "8").replace("{max}", "8"))).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText(sl.add.step3.tooLarge.split("(")[0].trim())).toHaveCount(0);

  await page.getByRole("button", { name: sl.add.submit }).click();
  await expect(page).toHaveURL(/\/sl\/map/, { timeout: 30_000 });
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
