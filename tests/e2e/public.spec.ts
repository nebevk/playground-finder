import { expect, test } from "@playwright/test";
import { en, sl } from "./fixtures";

test.describe("default locale", () => {
  // A browser that prefers neither sl nor en must fall back to Slovenian.
  test.use({ locale: "de-DE" });

  test("[NFR-I18N-01] Slovenian is the default locale and English is available", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sl\/?$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "sl");

    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});

test.describe("anonymous visitor", () => {
  test("[FR-MAP-01] browses the map without an account", async ({ page }) => {
    await page.goto("/sl/map");
    await expect(page.locator(".playground-marker, .marker-cluster").first()).toBeVisible();
  });

  test("[FR-MAP-04] tapping a marker opens the bottom sheet with a link to the detail page", async ({ page }) => {
    await page.goto("/sl/map");
    const marker = page.locator(".playground-marker").first();
    const cluster = page.locator(".marker-cluster").first();
    await expect(marker.or(cluster).first()).toBeVisible();

    // Zoom into clusters until a single marker is on screen.
    for (let i = 0; i < 6 && !(await marker.isVisible()); i++) {
      await cluster.click();
      await page.waitForTimeout(400);
    }
    await marker.click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('a[href*="/playground/"]').first()).toBeVisible();
    await expect(sheet.locator('a[href^="https://www.google.com/maps/dir/"]')).toBeVisible();
  });

  test("[FR-MAP-02] Locate me moves the map to the user's position", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 46.5547, longitude: 15.6459 }); // Maribor
    await page.goto("/sl/map");
    await expect(page.locator(".leaflet-container")).toBeVisible();

    const locate = page.getByRole("button", { name: sl.map.locateMe });
    if (!(await locate.isVisible())) await page.getByRole("button", { name: sl.map.controls }).click();
    await locate.click();

    // Locate zooms to 15 around the user. Tiles at z15 near Maribor have x ≈ 17808
    // (Ljubljana's are ≈ 17704), so tile URLs prove where the map went.
    await expect(page.locator('img.leaflet-tile[src*="/15/1780"]').first()).toBeAttached();
  });

  // Known gap (backlog BL-13).
  test.fixme("[FR-MAP-02] Locate me explains when location is denied or unavailable", async () => {});

  test("[FR-MAP-09] home lists playgrounds and links to the map", async ({ page }) => {
    await page.goto("/sl");
    await expect(page.locator('a[href*="/playground/"]').first()).toBeVisible();
    // The side nav also links to /sl/map but is hidden on mobile.
    await expect(page.locator('a[href="/sl/map"]').filter({ visible: true }).first()).toBeVisible();
  });

  test("[FR-ADM-01] admin pages show the not-found page to visitors", async ({ page }) => {
    // HTTP status stays 200: [locale]/loading.tsx streams the shell before notFound() runs.
    // What matters is that no admin content renders and the page is marked noindex.
    await page.goto("/sl/admin");
    await expect(page.getByRole("heading", { level: 1, name: sl.common.notFoundTitle })).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  });
});

test.describe("legal pages", () => {
  for (const [locale, m] of [["sl", sl], ["en", en]] as const) {
    test(`[GDPR-10] /${locale}/privacy names every processor and a contact`, async ({ page }) => {
      await page.goto(`/${locale}/privacy`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      for (const text of Object.values(m.privacy.processors)) {
        await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
      }
      await expect(page.locator('a[href^="mailto:"], :text("@")').first()).toBeVisible();
    });

    test(`[GDPR-11] /${locale}/terms makes uploaders responsible for their photos`, async ({ page }) => {
      await page.goto(`/${locale}/terms`);
      await expect(page.getByText(m.terms.content.body)).toBeVisible();
    });
  }

  test("[GDPR-12] the essential-cookies notice shows once and stays dismissed", async ({ browser }) => {
    // Fresh context without the pre-acknowledged notice from playwright.config.ts.
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto("/sl");
    const notice = page.getByText(sl.cookies.message);
    await expect(notice).toBeVisible();
    await page.getByRole("button", { name: sl.cookies.accept }).click();
    await expect(notice).toBeHidden();
    await page.reload();
    await expect(notice).toBeHidden();

    const cookies = await context.cookies();
    const nonEssential = cookies.filter((c) => !c.name.startsWith("sb-") && c.name !== "NEXT_LOCALE");
    expect(nonEssential.map((c) => c.name)).toEqual([]);
    await context.close();
  });
});

test.describe("mobile layout", () => {
  const pages = ["/sl", "/sl/map", "/sl/about", "/sl/privacy", "/sl/terms", "/sl/login", "/sl/signup"];

  for (const path of pages) {
    test(`[NFR-UX-01] ${path} has no horizontal scroll at 375 px`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("[NFR-UX-02] bottom navigation is visible with touch targets of at least 44×44 px", async ({ page }) => {
    await page.goto("/sl");
    const items = page.locator("nav.dock > a");
    await expect(items.first()).toBeVisible();
    for (const item of await items.all()) {
      const box = await item.boundingBox();
      expect(box, "nav item must be rendered").not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe("platform", () => {
  test("[NFR-SEC-03] responses carry the security headers", async ({ request }) => {
    const res = await request.get("/sl");
    const h = res.headers();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("geolocation=(self)");
    expect(h["strict-transport-security"]).toContain("max-age=");
  });

  // Known gap (backlog BL-21).
  test.fixme("[NFR-SEC-03] responses carry a Content-Security-Policy", async ({ request }) => {
    const res = await request.get("/sl");
    expect(res.headers()["content-security-policy"]).toBeTruthy();
  });

  test("[NFR-PWA-01] the web manifest makes the app installable", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    const manifest = await res.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose?.includes("maskable"))).toBe(true);
  });

  test("[NFR-SEO-01] sitemap lists playgrounds and robots.txt blocks /admin", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/sl/playground/");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: .*admin/);
  });
});
