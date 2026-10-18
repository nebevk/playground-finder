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

test("[FR-PG-01] [NFR-I18N-03] equipment is shown with translated labels", async ({ page }) => {
  // Seeded Tivoli equipment: swings, slides, climbing_wall, sandbox.
  await expect(page.getByText(sl.detail.equipmentOptions.climbing_wall)).toBeVisible();
  await expect(page.getByText("climbing_wall")).toHaveCount(0);
});

// Known gaps (backlog BL-26, BL-22).
test.fixme("[FR-PG-01] photos open in a swipeable carousel", async () => {});
test.fixme("[NFR-SEO-02] every public page links its sl/en alternates with hreflang", async () => {});
