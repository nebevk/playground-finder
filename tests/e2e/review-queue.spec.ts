import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { E2E_ADMIN_USER, login, sl } from "./fixtures";

// The review queue (ADR-0003): discoveries wait, hidden, until an admin publishes or rejects them.
// Service role, local stack only (global-setup refuses anything else): adds discoveries the way the
// discovery routine will.
const service = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const q = sl.admin.pending;

// Around Novo mesto: far from the seeded playgrounds and from every place the other tests stand, so
// publishing a discovery changes none of their results.
const NOVO_MESTO = { lng: 15.1689, lat: 45.8034 };

// A waiting OSM discovery. Names are ASCII so they can be found as they are in the page's HTML.
async function addDiscovery(label: string, extra: Record<string, unknown> = {}, { lng, lat } = NOVO_MESTO) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const name = `E2E discovery ${label} ${stamp}`;
  const { data, error } = await service()
    .from("playgrounds")
    .insert({
      name,
      location: `SRID=4326;POINT(${lng} ${lat})`,
      status: "pending",
      source: "osm",
      external_id: `node/${stamp}`,
      source_notes: "OSM: leisure=playground",
      ...extra,
    })
    .select("id")
    .single();
  expect(error).toBeNull();
  return { id: data!.id as string, name, osmId: `node/${stamp}` };
}

test("[FR-ADM-01] the review queue shows visitors the not-found page", async ({ request }) => {
  expect((await request.get("/sl/admin/pending")).status()).toBe(404);
});

test("[FR-ADM-08] [NFR-SEO-01] a discovery waiting for review has no page and isn't in the sitemap", async ({ request }) => {
  // Seeded (supabase/seed.sql), so it was there when the sitemap was built.
  const { data, error } = await service().from("playgrounds").select("id").eq("name", "Igrišče Rožna dolina").single();
  expect(error).toBeNull();
  const id = data!.id as string;

  expect((await request.get(`/sl/playground/${id}`)).status()).toBe(404);
  expect((await request.get(`/en/playground/${id}`)).status()).toBe(404);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/sl/playground/");
  expect(sitemap).not.toContain(id);
});

test("[FR-ADM-07] [FR-ADM-08] an admin publishes a discovery from the queue; visitors then see it, and not the one still waiting", async ({ page, request }) => {
  test.setTimeout(90_000);
  // A pair about 25 m apart, so each lists the other as nearby. Somewhere new in each run (within
  // ~5 km), so earlier runs' playgrounds don't crowd the nearby list (it shows the 20 closest).
  const at = { lng: NOVO_MESTO.lng + (Math.random() - 0.5) * 0.1, lat: NOVO_MESTO.lat + (Math.random() - 0.5) * 0.1 };
  const published = await addDiscovery("publish", { has_shade: true, equipment: ["swings"] }, at);
  const waiting = await addDiscovery("waiting", {}, { lng: at.lng + 0.0003, lat: at.lat + 0.0001 });

  await login(page, E2E_ADMIN_USER);
  await page.goto("/sl/admin/pending");
  const card = page.getByRole("article", { name: published.name, exact: true });
  await expect(card).toBeVisible();
  // What the reviewer decides on: the OSM feature, what it lists, and what's already nearby.
  await expect(card.getByRole("link", { name: q.openFeature })).toHaveAttribute(
    "href",
    `https://www.openstreetmap.org/${published.osmId}`,
  );
  const details = card.getByRole("list", { name: q.detailsLabel });
  await expect(details.getByText(sl.detail.feature.has_shade, { exact: true })).toBeVisible();
  await expect(details.getByText(sl.detail.equipmentOptions.swings, { exact: true })).toBeVisible();
  await expect(card.getByRole("listitem").filter({ hasText: waiting.name })).toContainText(q.nearbyStatus.pending);

  await card.getByRole("button", { name: q.publish, exact: true }).click();
  await expect(card).toHaveCount(0);
  // The one still waiting now lists the published one nearby, as a link to its page.
  const waitingCard = page.getByRole("article", { name: waiting.name, exact: true });
  await expect(waitingCard.getByRole("link", { name: published.name })).toHaveAttribute(
    "href",
    `/sl/playground/${published.id}`,
  );

  // A visitor: the published one has its page and is on the map; the waiting one is neither.
  expect((await request.get(`/sl/playground/${published.id}`)).status()).toBe(200);
  expect((await request.get(`/sl/playground/${waiting.id}`)).status()).toBe(404);
  let map = "";
  await expect(async () => {
    map = await (await request.get("/sl/map")).text();
    expect(map).toContain(published.name);
  }).toPass({ timeout: 15_000 });
  expect(map).not.toContain(waiting.name);
});

test("[FR-ADM-07] a rejected discovery leaves the queue and stays hidden; publishing it from the rejected list undoes that", async ({ page, request }) => {
  const rejected = await addDiscovery("reject");

  await login(page, E2E_ADMIN_USER);
  await page.goto("/sl/admin/pending");
  const card = page.getByRole("article", { name: rejected.name, exact: true });
  await card.getByRole("button", { name: q.reject }).click();
  await expect(card).toHaveCount(0);

  const undo = page.getByRole("button", { name: q.publishNamed.replace("{name}", rejected.name) });
  await expect(undo).toBeVisible();
  expect((await request.get(`/sl/playground/${rejected.id}`)).status()).toBe(404);

  await undo.click();
  await expect(undo).toHaveCount(0);
  expect((await request.get(`/sl/playground/${rejected.id}`)).status()).toBe(200);
});

test("[FR-ADM-07] [FR-PG-01] editing in the queue saves only the features answered; the rest stay unknown", async ({ page }) => {
  const discovery = await addDiscovery("edit", { has_shade: true });

  await login(page, E2E_ADMIN_USER);
  await page.goto("/sl/admin/pending");
  await page.getByRole("article", { name: discovery.name, exact: true }).getByRole("button", { name: q.edit }).click();
  const dialog = page.locator("dialog[open]");
  const renamed = `${discovery.name} renamed`;
  await dialog.locator('input[name="name"]').fill(renamed);
  // Tapped twice: no drinking water (ops 0022).
  await dialog.getByText(sl.filters.feature.has_water, { exact: true }).click();
  await dialog.getByText(sl.filters.feature.has_water, { exact: true }).click();
  await dialog.getByRole("button", { name: sl.admin.playgrounds.save }).click();

  await expect(page.getByRole("article", { name: renamed, exact: true })).toBeVisible();
  const { data } = await service()
    .from("playgrounds")
    .select("status, has_shade, has_water, has_toilets")
    .eq("id", discovery.id)
    .single();
  // Still waiting, shade still known, the deliberate "no", and no invented "Brez stranišča".
  expect(data).toEqual({ status: "pending", has_shade: true, has_water: false, has_toilets: null });
});
