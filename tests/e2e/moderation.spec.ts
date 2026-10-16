import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { E2E_ADMIN_USER, E2E_USER, login, noisePng, sl } from "./fixtures";

// Service role, local stack only (global-setup refuses anything else): seeds a flagged photo.
const service = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

test("[FR-ADM-02] the moderation queue shows a flagged photo as a preview", async ({ page }) => {
  const db = service();
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  const uploaderId = users!.users.find((u) => u.email === E2E_USER.email)!.id;

  const { data: pg, error: pgErr } = await db
    .from("playgrounds")
    .insert({ name: `E2E prijavljena fotografija ${Date.now()}`, location: "SRID=4326;POINT(14.51 46.06)", user_id: uploaderId })
    .select("id")
    .single();
  expect(pgErr).toBeNull();
  const path = `${uploaderId}/${pg!.id}/0-flagged.png`;
  const { error: upErr } = await db.storage
    .from("playground-photos")
    .upload(path, noisePng(64, 48), { contentType: "image/png" });
  expect(upErr).toBeNull();
  const { error: rowErr } = await db
    .from("photos")
    .insert({ playground_id: pg!.id, user_id: uploaderId, storage_path: path, flagged: true });
  expect(rowErr).toBeNull();

  await login(page, E2E_ADMIN_USER);
  await page.goto("/sl/admin/moderation");

  // The private file is visible to the admin through a short-lived signed URL, and it loads.
  const preview = page.locator(`a[href*="${pg!.id}/0-flagged.png"] img`);
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute("alt", sl.admin.moderation.photoAlt);
  await expect(preview).toHaveAttribute("src", /\/object\/sign\/playground-photos\/.+\?token=/);
  await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
});
