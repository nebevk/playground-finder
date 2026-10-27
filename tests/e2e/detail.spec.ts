import { expect, test } from "@playwright/test";
import { playgroundPath, SEEDED_PLAYGROUND, sl } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto(await playgroundPath());
});

test("[FR-PG-01] the detail page shows features, rating and reviews", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: SEEDED_PLAYGROUND })).toBeVisible();
  await expect(page.getByRole("heading", { name: sl.detail.features })).toBeVisible();
  await expect(page.getByText(sl.detail.reviews).first()).toBeVisible();
  await expect(page.locator('a[href^="https://www.google.com/maps/dir/"]').first()).toBeVisible();
});

test("[NFR-SEO-02] the detail page sets its own title and Open Graph tags", async ({ page }) => {
  await expect(page).toHaveTitle(new RegExp(SEEDED_PLAYGROUND));
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", new RegExp(SEEDED_PLAYGROUND));
});

test("[NFR-SEO-03] [GDPR-16] a shared playground link shows the playground's own card", async ({ page, request }) => {
  const image = page.locator('meta[property="og:image"]');
  await expect(image).toHaveCount(1);
  const url = new URL((await image.getAttribute("content"))!);
  expect(url.pathname).toMatch(/^\/sl\/playground\/[0-9a-f-]{36}\/opengraph-image\/card$/);
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", new RegExp(SEEDED_PLAYGROUND));
  const res = await request.get(url.pathname + url.search);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
});

test("[FR-PG-01] [NFR-I18N-03] equipment is shown with translated labels", async ({ page }) => {
  // Seeded Tivoli equipment: swings, slides, climbing_wall, sandbox.
  await expect(page.getByText(sl.detail.equipmentOptions.climbing_wall)).toBeVisible();
  await expect(page.getByText("climbing_wall")).toHaveCount(0);
});

test("[FR-PG-01] features nobody answered stay out; answered ones don't say 'no data'", async ({ page }) => {
  // Seeded Park Zvezda: only shade is known. Unticked boxes in the add form still mean "Brez …"
  // (covered in account.spec.ts); unanswered features are left out, not "ni podatka".
  await page.goto(await playgroundPath("Park Zvezda"));
  await expect(page.getByText(sl.detail.feature.has_shade, { exact: true })).toBeVisible();
  await expect(page.getByText(sl.detail.featureAbsent.has_toilets, { exact: true })).toHaveCount(0);
  await expect(page.getByText(sl.detail.featureAbsent.has_water, { exact: true })).toHaveCount(0);
  await expect(page.getByText(sl.detail.featureAbsent.has_benches, { exact: true })).toHaveCount(0);
  await expect(page.getByText(sl.detail.feature.has_benches, { exact: true })).toHaveCount(0);
  await expect(page.getByText(sl.detail.noData)).toHaveCount(0);
});

// Known gap (backlog BL-22). The photo viewer is tested in account.spec.ts (it needs uploads).
test.fixme("[NFR-SEO-02] every public page links its sl/en alternates with hreflang", async () => {});
