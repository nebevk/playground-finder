import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import {
  E2E_ADMIN_USER,
  E2E_LOGOUT_USER,
  E2E_USER,
  expectTouchTargets,
  login,
  noisePng,
  playgroundPath,
  SEEDED_PLAYGROUND,
  sl,
} from "./fixtures";

test("[GDPR-01] signup consent is unchecked by default and required", async ({ page }) => {
  await page.goto("/sl/signup");
  const consent = page.locator('input[name="consent"]');
  await expect(consent).not.toBeChecked();

  await page.locator('input[name="email"]').fill(`nobody+${Date.now()}@example.com`);
  await page.locator('input[name="password"]').fill("secret-123456");
  await page.locator('input[name="age_confirmed"]').check();
  await page.getByRole("button", { name: sl.auth.submitSignup }).click();

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

  // Step 3: photos, with the children's-faces disclaimer. "Naprej" must only move here, not
  // submit (it once did: React reused the button and flipped its type within the click).
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
  await expect(page.getByText(sl.add.step3.selected.replace("{count}", "1").replace("{max}", "8"))).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: sl.add.submit }).click();

  await expect(page).toHaveURL(/\/sl\/map/, { timeout: 20_000 });
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText(name)).toBeVisible();
  await sheet.locator('a[href*="/playground/"]').first().click();
  // Private bucket: shown through a short-lived signed URL, not a public one.
  const img = page.locator('img[src*="playground-photos"]').first();
  await expect(img).toBeVisible();
  await expect(img).toHaveAttribute("src", /\/object\/sign\/playground-photos\/.+\?token=/);
  // The photo opens full screen, where it can be reported too (BL-12).
  await page.getByRole("button", { name: openPhotoLabel(1, 1) }).click();
  const viewer = page.getByRole("dialog", { name: sl.detail.photos });
  await expect(viewer.getByRole("button", { name: sl.detail.report, exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
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
  await expect(page.getByText(sl.add.step3.selected.replace("{count}", String(files.length)).replace("{max}", "8"))).toBeVisible({ timeout: 30_000 });
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

test("[FR-ACC-03] signing in from a playground returns to it", async ({ page }) => {
  const path = await playgroundPath();
  await page.goto(path);
  // Other tests may have reviewed it already, which swaps the link text.
  await page
    .getByRole("link", { name: sl.detail.loginToWriteFirst })
    .or(page.getByRole("link", { name: sl.detail.loginToReview }))
    .click();
  await expect(page).toHaveURL(/\/sl\/login\?next=/);
  await page.locator('input[name="email"]').fill(E2E_USER.email);
  await page.locator('input[name="password"]').fill(E2E_USER.password);
  await page.getByRole("button", { name: sl.auth.submitLogin }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`), { timeout: 20_000 });
});

test("[FR-ADD-02] [NFR-UX-02] the add flow says what's missing and warns about a nearby duplicate", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 46.0569, longitude: 14.4936 }); // the seeded Tivoli playground
  await login(page);
  await page.goto("/sl/add");

  // "Naprej" is never silently disabled: it says what's missing.
  await page.getByRole("button", { name: sl.add.next }).click();
  await expect(page.getByText(sl.add.errors.noLocation)).toBeVisible();

  await page.getByRole("button", { name: sl.map.useMyLocation }).click();
  await expect(page.getByText(/Tivoli Park Playground/)).toBeVisible();
  await expect(page.getByRole("link", { name: sl.add.step1.openExisting })).toBeVisible();

  await page.getByRole("button", { name: sl.add.next }).click();
  await page.getByRole("button", { name: sl.add.next }).click();
  await expect(page.getByText(sl.add.errors.noName)).toBeVisible();
  await expect(page.getByPlaceholder(sl.add.step2.namePlaceholder)).toBeFocused();

  // Surface chips, feature toggles and the sticky Back/Next bar.
  await expectTouchTargets(page.locator("main"), "add flow, step 2");
});

test("[FR-PG-01] photos open full screen: step through them, zoom in, report from there", async ({ page }) => {
  // Sign in, add a playground with two photos, then view them: a long journey under parallel load.
  test.setTimeout(90_000);
  await login(page);
  const name = `E2E galerija ${Date.now()}`;
  const path = await addPlayground(page, name, [
    { name: "a.png", mimeType: "image/png", buffer: noisePng(400, 300) },
    { name: "b.png", mimeType: "image/png", buffer: noisePng(300, 400) },
  ]);
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

  await page.getByRole("button", { name: openPhotoLabel(1, 2) }).click();
  const viewer = page.getByRole("dialog", { name: sl.detail.photos });
  await expect(viewer).toBeVisible();
  await expect(viewer.getByText("1 / 2")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(viewer.getByText("2 / 2")).toBeVisible();

  await viewer.getByRole("button", { name: sl.detail.zoomIn }).click();
  await expect(viewer.getByRole("button", { name: sl.detail.zoomOut })).toHaveAttribute("aria-pressed", "true");
  // Reporting lives in the viewer (signed-in visitors), not on every thumbnail.
  await expect(viewer.getByRole("button", { name: sl.detail.report, exact: true })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
});

test("[FR-ADD-08] the person who added a playground can edit it; nobody else can", async ({ page, browser }) => {
  test.setTimeout(90_000);
  await login(page);
  const name = `E2E urejanje ${Date.now()}`;
  const path = await addPlayground(page, name);
  await page.goto(path);

  await page.getByRole("link", { name: sl.detail.edit }).click();
  await expect(page).toHaveURL(new RegExp(`${path}/edit$`));
  const renamed = `${name} (popravljeno)`;
  await page.getByPlaceholder(sl.add.step2.namePlaceholder).fill(renamed);
  await page.getByText(sl.filters.feature.has_toilets, { exact: true }).click();
  await page.getByRole("button", { name: sl.edit.save }).click();

  await expect(page).toHaveURL(new RegExp(`${path}(\\?|$)`), { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1, name: renamed })).toBeVisible();
  await expect(page.getByText(sl.detail.updated)).toBeVisible();
  await expect(page.getByText(sl.detail.feature.has_toilets, { exact: true })).toBeVisible();
  await expect(page.getByText(sl.detail.featureAbsent.has_shade, { exact: true })).toBeVisible();

  // A visitor sees no edit link, and the edit page asks them to sign in.
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto(path);
  await expect(anonPage.getByRole("heading", { level: 1, name: renamed })).toBeVisible();
  await expect(anonPage.getByRole("link", { name: sl.detail.edit })).toHaveCount(0);
  await anonPage.goto(`${path}/edit`);
  await expect(anonPage).toHaveURL(/\/sl\/login\?next=/);
  await anon.close();

  // Any other signed-in user (an admin here) gets "not found"; the database refuses them too.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await login(otherPage, E2E_ADMIN_USER);
  await otherPage.goto(`${path}/edit`);
  await expect(otherPage.getByRole("heading", { level: 1, name: sl.common.notFoundTitle })).toBeVisible();
  await other.close();
});

test("[FR-ADD-06] photos can be added to an existing playground", async ({ page, browser }) => {
  test.setTimeout(90_000);
  await login(page);
  const name = `E2E dodaj fotografije ${Date.now()}`;
  const path = await addPlayground(page, name);
  await page.goto(path);
  await expect(page.getByText(sl.detail.noPhotos)).toBeVisible();

  await page.getByRole("link", { name: sl.detail.addPhotos }).click();
  await expect(page).toHaveURL(new RegExp(`${path}/photos$`));
  await expect(page.getByText(sl.add.step3.disclaimer)).toBeVisible();
  await page.locator('input[type="file"][multiple]').setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText(sl.add.step3.selected.replace("{count}", "1").replace("{max}", "8"))).toBeVisible();
  await page.getByRole("button", { name: sl.addPhotos.submit }).click();

  // FlashToast drops the "?photos=added" flag once the toast is up.
  await expect(page.getByText(sl.detail.photosAdded)).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(page.locator('img[src*="/object/sign/playground-photos/"]').first()).toBeVisible();

  // Visitors are asked to sign in first.
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto(`${path}/photos`);
  await expect(anonPage).toHaveURL(/\/sl\/login\?next=/);
  await anon.close();
});

test("[FR-COM-01] [FR-COM-02] [FR-PG-01] a review shows with its author, and its writer can edit it", async ({ page, browser }) => {
  test.setTimeout(90_000);
  await login(page);
  const path = await addPlayground(page, `E2E mnenje ${Date.now()}`);
  await page.goto(path);

  const reviews = page.locator("section#reviews");
  await reviews.getByRole("button", { name: starLabel(4) }).click();
  await reviews.getByRole("textbox", { name: sl.detail.comment }).fill("Prvi vtis");
  await reviews.getByRole("button", { name: sl.detail.submitReview }).click();
  // Generous, like the other save round trips: with several workers, the local auth server can
  // take seconds per call.
  await expect(reviews.getByText("Prvi vtis")).toBeVisible({ timeout: 20_000 });

  // Edit in place: the form opens prefilled.
  await reviews.getByRole("button", { name: sl.detail.editReview }).click();
  const comment = reviews.getByRole("textbox", { name: sl.detail.comment });
  await expect(comment).toHaveValue("Prvi vtis");
  await expect(reviews.getByRole("button", { name: starLabel(4) })).toHaveAttribute("aria-pressed", "true");
  await reviews.getByRole("button", { name: starLabel(2) }).click();
  await comment.fill("Popravljen vtis");
  await reviews.getByRole("button", { name: sl.detail.saveReview }).click();

  await expect(reviews.getByText("Popravljen vtis")).toBeVisible({ timeout: 20_000 });
  await expect(reviews.getByText("Prvi vtis")).toHaveCount(0);
  await expect(reviews.getByLabel("2/5")).toBeVisible();
  // Still one review, and the edit form is closed.
  await expect(reviews.getByRole("button", { name: sl.detail.saveReview })).toHaveCount(0);
  await page.reload();
  await expect(reviews.getByText("Popravljen vtis")).toBeVisible();

  // Everyone sees it, with the author's username, and nobody else gets an edit button.
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto(path);
  const anonReviews = anonPage.locator("section#reviews");
  await expect(anonReviews.getByRole("listitem").filter({ hasText: "Popravljen vtis" })).toContainText("e2e-verified");
  await expect(anonReviews.getByRole("button", { name: sl.detail.editReview })).toHaveCount(0);
  await anon.close();
});

test("[FR-COM-07] the profile lists your contributions, including ones under review", async ({ page }) => {
  test.setTimeout(90_000);
  // A fresh account, so the list holds exactly what this test adds.
  const db = service();
  const user = { email: `e2e-contrib-${Date.now()}@example.com`, password: "e2e-Password-123" };
  const { data: created, error: userErr } = await db.auth.admin.createUser({
    ...user,
    email_confirm: true,
    user_metadata: { consent_privacy_at: new Date().toISOString(), age_confirmed: true },
  });
  expect(userErr).toBeNull();
  const userId = created.user!.id;

  await login(page, user);
  await expect(page.getByText(sl.profile.contributions.empty)).toBeVisible();

  // One visible playground with a review and two photos (one under review), and one playground
  // under review.
  const stamp = Date.now();
  const visible = `E2E moj prispevek ${stamp}`;
  const hidden = `E2E v pregledu ${stamp}`;
  const { data: pgs, error: pgErr } = await db
    .from("playgrounds")
    .insert([
      // Both rows name every column: a bulk insert sends a missing one as null, not its default.
      { name: visible, location: "SRID=4326;POINT(14.52 46.05)", user_id: userId, flagged: false },
      { name: hidden, location: "SRID=4326;POINT(14.53 46.05)", user_id: userId, flagged: true },
    ])
    .select("id, name");
  expect(pgErr).toBeNull();
  const visibleId = pgs!.find((p) => p.name === visible)!.id;
  const { error: reviewErr } = await db
    .from("reviews")
    .insert({ playground_id: visibleId, user_id: userId, rating: 4, comment: "Lepo igrišče" });
  expect(reviewErr).toBeNull();
  for (const [i, flagged] of [false, true].entries()) {
    const storagePath = `${userId}/${visibleId}/${i}-e2e.png`;
    const { error: upErr } = await db.storage
      .from("playground-photos")
      .upload(storagePath, noisePng(64, 48), { contentType: "image/png" });
    expect(upErr).toBeNull();
    const { error: photoErr } = await db
      .from("photos")
      .insert({ playground_id: visibleId, user_id: userId, storage_path: storagePath, flagged });
    expect(photoErr).toBeNull();
  }

  await page.reload();
  const section = page.getByRole("region", { name: sl.profile.contributions.title });
  await expect(section.getByText(sl.profile.contributions.flaggedNote)).toBeVisible();

  const playgrounds = section.getByRole("region", { name: sl.profile.contributions.playgrounds });
  await expect(playgrounds.getByRole("link", { name: visible, exact: true })).toHaveAttribute("href", `/sl/playground/${visibleId}`);
  const hiddenRow = playgrounds.getByRole("listitem").filter({ hasText: hidden });
  // Exact: the seeded name "E2E v pregledu …" contains the badge's text too.
  await expect(hiddenRow.getByText(sl.profile.contributions.inReview, { exact: true })).toBeVisible();
  await expect(hiddenRow.getByRole("link")).toHaveCount(0);

  const reviewsList = section.getByRole("region", { name: sl.profile.contributions.reviews });
  await expect(reviewsList.getByRole("link")).toHaveAttribute("href", `/sl/playground/${visibleId}#reviews`);
  await expect(reviewsList.getByText("Lepo igrišče")).toBeVisible();

  const photos = section.getByRole("region", { name: sl.profile.contributions.photos });
  const photo = photos.getByRole("img", { name: sl.profile.contributions.photoOf.replace("{name}", visible) });
  await expect(photo).toHaveAttribute("src", /\/object\/sign\/playground-photos\/.+\?token=/);
  await expect(photos.getByText(sl.profile.contributions.inReview, { exact: true })).toBeVisible();

  await expectTouchTargets(section, "my contributions");
  await playgrounds.getByRole("link", { name: sl.profile.contributions.editNamed.replace("{name}", visible) }).click();
  await expect(page.getByRole("heading", { level: 1, name: sl.edit.title })).toBeVisible();
});

test("[FR-PG-04] a favourite saved with the heart is listed on the profile, and can be removed", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  const path = await playgroundPath();
  const heart = page.getByRole("button", { name: sl.favorites.label });
  const favourites = () => page.getByRole("region", { name: sl.profile.favorites.title });
  // The heart changes at once; wait for the save itself (the Server Action call) before moving on.
  const saved = (on: boolean) =>
    page.waitForResponse((r) => r.request().method() === "POST" && (r.request().postData() ?? "").endsWith(`${on}]`));

  // Start from "not a favourite": the local database keeps state between runs.
  await page.goto(path);
  if ((await heart.getAttribute("aria-pressed")) === "true") {
    await Promise.all([saved(false), heart.click()]);
    await expect(heart).toHaveAttribute("aria-pressed", "false");
  }

  await Promise.all([saved(true), heart.click()]);
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await page.goto("/sl/profile");
  await expect(favourites().getByRole("link", { name: SEEDED_PLAYGROUND })).toBeVisible({ timeout: 20_000 });

  // Saved for real: still on after a reload, then removed again.
  await page.goto(path);
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await Promise.all([saved(false), heart.click()]);
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await page.goto("/sl/profile");
  await expect(favourites().getByText(sl.profile.favorites.empty)).toBeVisible({ timeout: 20_000 });
});

test("[FR-ADD-07] play equipment chosen when adding shows on the playground's page", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await page.goto("/sl/add");
  await page.locator(".leaflet-container").first().click({ position: { x: 140, y: 120 } });
  await page.getByRole("button", { name: sl.add.next }).click();
  const name = `E2E igrala ${Date.now()}`;
  await page.getByPlaceholder(sl.add.step2.namePlaceholder).fill(name);
  await page.getByText(sl.detail.equipmentOptions.swings, { exact: true }).click();
  await page.getByText(sl.detail.equipmentOptions.sandbox, { exact: true }).click();
  await page.getByRole("button", { name: sl.add.next }).click();
  await page.getByRole("button", { name: sl.add.submit }).click();

  await expect(page).toHaveURL(/\/sl\/map/, { timeout: 20_000 });
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText(name)).toBeVisible();
  await sheet.locator('a[href*="/playground/"]').first().click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  const equipment = page.locator("section", { has: page.getByRole("heading", { name: sl.detail.equipment }) });
  await expect(equipment.getByText(sl.detail.equipmentOptions.swings, { exact: true })).toBeVisible();
  await expect(equipment.getByText(sl.detail.equipmentOptions.sandbox, { exact: true })).toBeVisible();
  await expect(equipment.getByText(sl.detail.equipmentOptions.slides, { exact: true })).toHaveCount(0);
});

// A star's name in the review form.
function starLabel(n: number) {
  return sl.detail.starLabel.replace("{n}", String(n));
}

// Service role, local stack only (global-setup refuses anything else): seeds data directly.
function service() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// The viewer's name for "open photo n of total".
function openPhotoLabel(n: number, total: number) {
  return sl.detail.openPhoto.replace("{n}", String(n)).replace("{total}", String(total));
}

// Adds a playground through the real add flow and returns its detail page's path.
async function addPlayground(page: Page, name: string, photos: { name: string; mimeType: string; buffer: Buffer }[] = []) {
  await page.goto("/sl/add");
  await page.locator(".leaflet-container").first().click({ position: { x: 150, y: 130 } });
  await page.getByRole("button", { name: sl.add.next }).click();
  await page.getByPlaceholder(sl.add.step2.namePlaceholder).fill(name);
  await page.getByRole("button", { name: sl.add.next }).click();
  if (photos.length > 0) {
    await page.locator('input[type="file"][multiple]').setInputFiles(photos);
    // Submitting while the picker still prepares photos would leave them out.
    const selected = sl.add.step3.selected.replace("{count}", String(photos.length)).replace("{max}", "8");
    await expect(page.getByText(selected)).toBeVisible({ timeout: 30_000 });
  }
  await page.getByRole("button", { name: sl.add.submit }).click();
  await expect(page).toHaveURL(/\/sl\/map/, { timeout: 20_000 });
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText(name)).toBeVisible();
  const href = await sheet.locator('a[href*="/playground/"]').first().getAttribute("href");
  return href!;
}
