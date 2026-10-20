import { expect, test } from "@playwright/test";
import { en, expectTouchTargets, sl } from "./fixtures";

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
    // Leaflet's plus-lighter tile blending drew a white seam on fractional-DPR phones.
    await expect(page.locator("img.leaflet-tile").first()).toHaveCSS("mix-blend-mode", "normal");
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

  test("[FR-MAP-03] cluster bubbles are round, with the count centred in the halo", async ({ page }) => {
    await page.goto("/sl/map");
    const cluster = page.locator(".brand-cluster").first();
    await expect(cluster).toBeVisible();
    // Leaflet's CSS loads later and once won (display: block, 20 px radius): the circle sat at
    // the top of its halo, which read as a misaligned shadow.
    const halo = (await cluster.boundingBox())!;
    const dot = (await cluster.locator("span").boundingBox())!;
    expect(Math.abs(halo.x + halo.width / 2 - (dot.x + dot.width / 2))).toBeLessThanOrEqual(1);
    expect(Math.abs(halo.y + halo.height / 2 - (dot.y + dot.height / 2))).toBeLessThanOrEqual(1);
    expect(await cluster.evaluate((el) => getComputedStyle(el).borderRadius)).toBe("9999px");
  });

  test("[NFR-UX-02] the closed playground sheet never covers the bottom navigation", async ({ page }) => {
    await page.goto("/sl/map");
    await expect(page.locator(".leaflet-container")).toBeVisible();
    // A CSS locator on purpose: getByRole and elementFromPoint both skip the closed sheet
    // (aria-hidden, inert), which is how an empty white strip over the nav's icons slipped by.
    const sheet = page.locator('[role="dialog"][aria-modal="false"]');
    const pageScrolls = () => page.evaluate(() => document.scrollingElement!.scrollHeight > innerHeight);
    await expect(sheet).toBeHidden();
    expect(await pageScrolls()).toBe(false);

    // Open a sheet, close it again: it must slide fully away.
    const marker = page.locator(".playground-marker").first();
    for (let i = 0; i < 6 && !(await marker.isVisible()); i++) {
      await page.locator(".marker-cluster").first().click();
      await page.waitForTimeout(400);
    }
    await marker.click();
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: sl.map.close }).click();
    await expect(sheet).toBeHidden();
    expect(await pageScrolls()).toBe(false);
  });

  test("[FR-MAP-02] Locate me moves the map to the user's position", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 46.5547, longitude: 15.6459 }); // Maribor
    await page.goto("/sl/map");
    await expect(page.locator(".leaflet-container")).toBeVisible();

    // Always visible, one tap (BL-51).
    await page.getByRole("button", { name: sl.map.locateMe }).click();

    // Locate zooms to 15 around the user. Tiles at z15 near Maribor have x ≈ 17808
    // (Ljubljana's are ≈ 17704), so tile URLs prove where the map went.
    await expect(page.locator('img.leaflet-tile[src*="/15/1780"]').first()).toBeAttached();
    // "You are here": accuracy circle + dot.
    await expect(page.locator(".leaflet-overlay-pane path")).toHaveCount(2);
  });

  test("[FR-MAP-02] Locate me explains when location is denied", async ({ page }) => {
    // No permission granted: the browser denies the request.
    await page.goto("/sl/map");
    await page.getByRole("button", { name: sl.map.locateMe }).click();
    await expect(page.getByText(sl.map.locateDenied)).toBeVisible();
  });

  test("[FR-MAP-08] one tap opens the filters, and the button shows how many are active", async ({ page }) => {
    await page.goto("/sl/map");
    await page.getByRole("button", { name: sl.filters.open, exact: true }).click();
    const drawer = page.getByRole("dialog", { name: sl.filters.title });
    await drawer.getByText(sl.filters.feature.has_shade, { exact: true }).click();
    const apply = drawer.getByRole("button", { name: /^Pokaži / });
    await expect(apply).toHaveText(/^Pokaži \d+ igrišč/);
    await apply.click();
    await expect(page.getByRole("button", { name: sl.filters.openWithCount.replace("{count}", "1") })).toBeVisible();
  });

  test("[FR-MAP-09] [NFR-A11Y-01] home lists playgrounds, has one h1 and links to the map", async ({ page }) => {
    await page.goto("/sl");
    await expect(page.locator('a[href*="/playground/"]').first()).toBeVisible();
    // The side nav also links to /sl/map but is hidden on mobile.
    await expect(page.locator('a[href="/sl/map"]').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(sl.home.explore) })).toBeVisible();
    // One h1 (for screen readers on phones, where the wordmark is the visual title).
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1, name: sl.home.title })).toBeAttached();
    // Flat list rows: no coloured left stripes.
    await expect(page.locator('main a[href*="/playground/"]').first()).toHaveCSS("border-left-width", "0px");
  });

  test("[FR-MAP-09] [GDPR-13] one tap on Home lists the nearest playgrounds with distances", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    // ~85 m from the seeded Tivoli playground (46.0569, 14.4936), with digits no playground has.
    await context.setGeolocation({ latitude: 46.05731, longitude: 14.49452 });
    // Count position requests, to prove the page asks only after the tap.
    await page.addInitScript(() => {
      const geo = navigator.geolocation;
      const calls = { n: 0 };
      Object.assign(window, { __geoCalls: calls });
      const get = geo.getCurrentPosition.bind(geo);
      const watch = geo.watchPosition.bind(geo);
      geo.getCurrentPosition = (...args: Parameters<Geolocation["getCurrentPosition"]>) => {
        calls.n++;
        get(...args);
      };
      geo.watchPosition = (...args: Parameters<Geolocation["watchPosition"]>) => {
        calls.n++;
        return watch(...args);
      };
    });
    const sent: string[] = [];
    page.on("request", (r) => sent.push(`${r.url()} ${r.postData() ?? ""}`));
    const geoCalls = () => page.evaluate(() => (window as unknown as { __geoCalls: { n: number } }).__geoCalls.n);

    await page.goto("/sl");
    await page.waitForLoadState("networkidle");
    expect(await geoCalls()).toBe(0);

    await page.getByRole("button", { name: sl.home.findNearby }).click();
    const heading = page.getByRole("heading", { name: sl.home.nearby });
    // The button gives way to the list, so focus moves to its heading.
    await expect(heading).toBeFocused();
    const nearby = page.locator("section", { has: heading });
    await expect(nearby).toBeVisible();
    const first = nearby.locator('a[href*="/playground/"]').first();
    await expect(first).toContainText("Tivoli");
    await expect(first).toContainText(/\d+ m|\d+(,\d)? km/);
    await expect(nearby.locator('a[href*="/playground/"]')).toHaveCount(3);
    await expect(nearby.getByText(sl.home.nearbyFrom)).toBeVisible();
    await expect(nearby.getByRole("button", { name: sl.home.refreshLabel })).toBeVisible();
    // Listed once: Tivoli leaves "Najbolj priljubljena" for "V bližini".
    await expect(page.locator('main a[href*="/playground/"]', { hasText: "Tivoli" })).toHaveCount(1);
    // The teaser numbers the nearest pins 1 to 3, like the rows.
    await expect(page.locator(".playground-marker--ranked")).toHaveCount(3);
    expect(await geoCalls()).toBeGreaterThan(0);

    // Distances are computed in the browser: the position is never sent anywhere.
    await page.waitForLoadState("networkidle");
    expect(sent.filter((s) => s.includes("46.0573") || s.includes("14.4945"))).toEqual([]);
  });

  test("[NFR-A11Y-01] a denied location keeps keyboard focus on the Home button", async ({ page }) => {
    // No permission granted: the browser denies the request. The button must not be natively
    // disabled while it waits, or focus would drop to <body>.
    await page.goto("/sl");
    const button = page.getByRole("button", { name: sl.home.findNearby });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(sl.map.locateDenied)).toBeVisible();
    await expect(button).toBeFocused();
  });

  test("[GDPR-10] Privacy and Terms are one tap away in the mobile navigation", async ({ page }) => {
    await page.goto("/sl/map");
    await page.locator("nav.dock").getByRole("button", { name: sl.nav.more }).click();
    await page.getByRole("dialog", { name: sl.nav.more }).getByRole("link", { name: sl.nav.privacy }).click();
    await expect(page).toHaveURL(/\/sl\/privacy/);
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

  test("[NFR-UX-02] Home controls are at least 44×44 px, before and after locating", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 46.05731, longitude: 14.49452 });
    await page.goto("/sl");
    await expect(page.getByRole("button", { name: sl.home.findNearby })).toBeVisible();
    await expectTouchTargets(page.locator("main"), "home");
    await page.getByRole("button", { name: sl.home.findNearby }).click();
    await expect(page.getByRole("heading", { name: sl.home.nearby })).toBeVisible();
    // Adds "Osveži" and distances; the teaser map is inert, so it holds no links.
    await expectTouchTargets(page.locator("main"), "home located");
  });

  test("[NFR-UX-02] touch targets are at least 44×44 px: nav, map controls, sheet, filters, menu", async ({ page }) => {
    await page.goto("/sl/map");
    await expectTouchTargets(page.locator("nav.dock"), "bottom nav");
    await expectTouchTargets(page.locator(".leaflet-container > div").filter({ has: page.getByRole("button") }), "map controls");

    // The playground sheet (tap a pin; zoom into clusters first).
    const marker = page.locator(".playground-marker").first();
    for (let i = 0; i < 6 && !(await marker.isVisible()); i++) {
      await page.locator(".marker-cluster").first().click();
      await page.waitForTimeout(400);
    }
    await marker.click();
    await expectTouchTargets(page.getByRole("dialog"), "playground sheet");
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: sl.filters.open, exact: true }).click();
    await expectTouchTargets(page.getByRole("dialog", { name: sl.filters.title }), "filter drawer");
    await page.keyboard.press("Escape");

    await page.locator("nav.dock").getByRole("button", { name: sl.nav.more }).click();
    await expectTouchTargets(page.getByRole("dialog", { name: sl.nav.more }), "more menu");
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
