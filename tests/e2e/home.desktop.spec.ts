import { expect, test } from "@playwright/test";
import { sl } from "./fixtures";

// Runs in the "desktop" project (1440×900, playwright.config.ts).

test("[FR-MAP-09] [NFR-A11Y-01] desktop Home: one h1, the list beside a full-height map", async ({ page }) => {
  await page.goto("/sl");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1, name: sl.home.title })).toBeVisible();

  // One Leaflet map (the phone teaser isn't mounted), reaching the right and bottom edges.
  const map = page.locator(".leaflet-container");
  await expect(map).toHaveCount(1);
  await expect(page.locator(".playground-marker").first()).toBeVisible();
  const box = (await map.boundingBox())!;
  expect(Math.round(box.x + box.width)).toBe(1440);
  expect(Math.round(box.height)).toBe(900);
  await expect(page.getByRole("link", { name: new RegExp(sl.home.explore) })).toBeVisible();
  await expect(page.locator('main a[href*="/playground/"]').first()).toHaveCSS("border-left-width", "0px");

  // Dragging pans the map; only a pin or the explicit link navigates. Start in the bottom-left
  // padding, where framing keeps pins out.
  await page.mouse.move(box.x + 30, box.y + box.height - 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 210, box.y + box.height - 90, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/sl\/?$/);
});

test("[FR-MAP-09] [GDPR-13] desktop near me: numbered results, focus on the heading, a row brings its pin into view", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  // ~85 m from the seeded Tivoli playground, with digits no playground has.
  await context.setGeolocation({ latitude: 46.05731, longitude: 14.49452 });
  const sent: string[] = [];
  page.on("request", (r) => sent.push(`${r.url()} ${r.postData() ?? ""}`));

  await page.goto("/sl");
  await page.getByRole("button", { name: sl.home.findNearby }).click();
  const heading = page.getByRole("heading", { name: sl.home.nearby });
  await expect(heading).toBeFocused();
  const nearby = page.locator("section", { has: heading });
  const rows = nearby.locator('a[href*="/playground/"]');
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("Tivoli");
  await expect(rows.first()).toContainText(/\d+ m|\d+(,\d)? km/);
  await expect(page.locator(".playground-marker--ranked")).toHaveCount(3);
  await expect(page.locator('main a[href*="/playground/"]', { hasText: "Tivoli" })).toHaveCount(1);

  // Hovering a row lights up its pin, panned fully into view (it may start off-screen).
  const latest = page.locator("section", { has: page.getByRole("heading", { name: sl.home.latest }) });
  await latest.locator('a[href*="/playground/"]').first().hover();
  const active = page.locator(".playground-marker--active");
  await expect(active).toBeVisible();
  const mapBox = (await page.locator(".leaflet-container").boundingBox())!;
  await expect
    .poll(async () => {
      const pin = await active.boundingBox();
      return (
        !!pin &&
        pin.x >= mapBox.x &&
        pin.y >= mapBox.y &&
        pin.x + pin.width <= mapBox.x + mapBox.width &&
        pin.y + pin.height <= mapBox.y + mapBox.height
      );
    })
    .toBe(true);

  // Distances are computed in the browser: the position is never sent anywhere.
  await page.waitForLoadState("networkidle");
  expect(sent.filter((s) => s.includes("46.0573") || s.includes("14.4945"))).toEqual([]);
});

test("[NFR-A11Y-01] the current side-nav page is a flat tint with a visible focus ring", async ({ page }) => {
  await page.goto("/sl");
  const home = page.locator("aside").getByRole("link", { name: sl.nav.home });
  await expect(home).toHaveAttribute("aria-current", "page");
  // No edge bar or depth shadow (the old inset bar drew a crescent on the pill).
  await expect(home).toHaveCSS("box-shadow", "none");
  await expect(home).toHaveCSS("font-weight", "600");
  expect(Math.round((await home.boundingBox())!.height)).toBeGreaterThanOrEqual(44);

  // Reached by keyboard (from the brand link above it), it shows a 2 px ring.
  await page.locator('aside a[href="/sl"]').first().focus();
  await page.keyboard.press("Tab");
  await expect(home).toBeFocused();
  await expect(home).toHaveCSS("outline-style", "solid");
  await expect(home).toHaveCSS("outline-width", "2px");
});
