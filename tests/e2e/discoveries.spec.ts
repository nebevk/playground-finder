import { expect, test, type APIRequestContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { E2E_DISCOVERY_SECRET } from "./discoveries-secret";
import { sl } from "./fixtures";

// POST /api/discoveries (BL-70, FR-ADM-09) against the local stack: what lands, what's skipped, what's
// rejected. The rules themselves are unit-tested (tests/unit/discoveries.test.ts).

// Service role, local stack only (global-setup refuses anything else).
const service = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const AUTH = { authorization: `Bearer ${E2E_DISCOVERY_SECRET}` };
const post = (request: APIRequestContext, data: unknown, headers: Record<string, string> = AUTH) =>
  request.post("/api/discoveries", { data, headers });

// A candidate somewhere new around Murska Sobota: inside Slovenia, far from the seeded playgrounds,
// from the review-queue tests (Novo mesto) and from where any other test stands.
function candidate(over: Record<string, unknown> = {}) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
  return {
    name: `E2E discovered ${stamp}`,
    lat: 46.6 + Math.random() * 0.12,
    lng: 16.05 + Math.random() * 0.2,
    source: "osm",
    external_id: `node/${stamp}`,
    source_notes: "OSM: leisure=playground",
    ...over,
  };
}

// One worker, in order: beforeAll clears up after earlier runs, which must not happen under another
// test's feet.
test.describe.configure({ mode: "serial" });

// Every run starts clean: this spec's discoveries from earlier runs go (so new random spots never
// land next to an old one), and other tests' OSM rows (the review queue's) move to the day before,
// so they don't use up today's cap. Only rows named "E2E…" are touched.
test.beforeAll(async () => {
  const db = service();
  const removed = await db.from("playgrounds").delete().like("name", "E2E discovered %");
  expect(removed.error).toBeNull();
  const yesterday = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
  const moved = await db
    .from("playgrounds")
    .update({ created_at: yesterday })
    .eq("source", "osm")
    .like("name", "E2E%")
    .gt("created_at", yesterday);
  expect(moved.error).toBeNull();
});

test("[FR-ADM-09] [NFR-SEC-05] only callers with the secret get in", async ({ request }) => {
  expect((await post(request, { candidates: [candidate()] }, {})).status()).toBe(401);
  expect((await post(request, { candidates: [candidate()] }, { authorization: `Bearer ${"x".repeat(40)}` })).status()).toBe(401);
  expect((await request.get("/api/discoveries")).status()).toBe(405);
});

test("[FR-ADM-09] [FR-ADM-08] a discovery waits as pending, hidden from the public, and only ever once", async ({ request }) => {
  const discovery = candidate({ features: { has_shade: true, has_water: false } });
  const res = await post(request, { candidates: [discovery] });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.counts).toEqual({ inserted: 1, skipped: 0, rejected: 0 });
  const id: string = body.inserted[0].id;

  const db = service();
  const { data: row } = await db
    .from("playgrounds")
    .select("status, source, external_id, user_id, has_shade, has_water, has_toilets, source_notes")
    .eq("id", id)
    .single();
  // Pending, from OSM, nobody's; only the answered features are set (has_toilets stays unknown).
  expect(row).toEqual({
    status: "pending",
    source: "osm",
    external_id: discovery.external_id,
    user_id: null,
    has_shade: true,
    has_water: false,
    has_toilets: null,
    source_notes: "OSM: leisure=playground",
  });
  expect((await request.get(`/sl/playground/${id}`)).status()).toBe(404);

  // Sent again: skipped. Rejected in the queue, then sent again: still skipped.
  const again = await (await post(request, { candidates: [discovery] })).json();
  expect(again.skipped).toEqual([{ index: 0, external_id: discovery.external_id, reason: "duplicate_external_id" }]);
  await db.from("playgrounds").update({ status: "rejected" }).eq("id", id);
  const afterReject = await (await post(request, { candidates: [discovery] })).json();
  expect(afterReject.skipped[0].reason).toBe("duplicate_external_id");

  // Another OSM feature about 35 m away is the same playground, even though that one was rejected.
  const close = candidate({ lat: discovery.lat + 0.0003, lng: discovery.lng });
  const nearby = await (await post(request, { candidates: [close] })).json();
  expect(nearby.skipped).toEqual([{ index: 0, external_id: close.external_id, reason: "nearby", nearby_id: id }]);
});

test("[FR-ADM-09] each candidate is judged on its own: near a playground, outside Slovenia, malformed", async ({ request }) => {
  const { data: tivoli } = await service().from("playgrounds").select("id").eq("name", "Tivoli Park Playground").single();
  const body = await (
    await post(request, {
      candidates: [
        candidate({ lat: 46.0571, lng: 14.4938 }), // about 30 m from the seeded Tivoli playground
        candidate({ lat: 45.6495, lng: 13.7768 }), // Trieste
        candidate({ external_id: "12345" }), // not an OSM id
      ],
    })
  ).json();
  expect(body.counts).toEqual({ inserted: 0, skipped: 1, rejected: 2 });
  expect(body.skipped[0]).toMatchObject({ index: 0, reason: "nearby", nearby_id: tivoli!.id });
  expect(body.rejected.map((r: { index: number; reason: string }) => [r.index, r.reason])).toEqual([
    [1, "outside_slovenia"],
    [2, "invalid"],
  ]);
});

test("[FR-PG-06] once published, a discovery's page credits OpenStreetMap and links its feature", async ({ page, request }) => {
  const discovery = candidate();
  const body = await (await post(request, { candidates: [discovery] })).json();
  const id: string = body.inserted[0].id;
  await service().from("playgrounds").update({ status: "published" }).eq("id", id);

  // The rendered links, not the HTML: every page carries all messages for the browser.
  await page.goto(`/sl/playground/${id}`);
  await expect(page.getByRole("link", { name: sl.detail.osmCredit })).toHaveAttribute(
    "href",
    "https://www.openstreetmap.org/copyright",
  );
  await expect(page.getByRole("link", { name: sl.detail.osmFeature })).toHaveAttribute(
    "href",
    `https://www.openstreetmap.org/${discovery.external_id}`,
  );

  // The About page credits OSM's data too; a playground people added carries no OSM credit.
  await page.goto("/sl/about");
  await expect(page.getByRole("link", { name: sl.about.dataLink })).toHaveAttribute(
    "href",
    "https://www.openstreetmap.org/copyright",
  );
  const { data: seeded } = await service().from("playgrounds").select("id").eq("name", "Tivoli Park Playground").single();
  await page.goto(`/sl/playground/${seeded!.id}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: sl.detail.osmCredit })).toHaveCount(0);
});

test("[FR-ADM-09] `max` lets in at most that many per call; the rest wait for another day", async ({ request }) => {
  const body = await (await post(request, { max: 1, candidates: [candidate(), candidate()] })).json();
  expect(body.counts).toEqual({ inserted: 1, skipped: 1, rejected: 0 });
  expect(body.skipped[0].reason).toBe("daily_cap");
  expect(body.cap_remaining_today).toBeGreaterThanOrEqual(0);
});
