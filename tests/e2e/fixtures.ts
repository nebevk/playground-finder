import { expect, type Page } from "@playwright/test";
import en from "../../src/messages/en.json";
import sl from "../../src/messages/sl.json";

export { en, sl };

export const E2E_USER = {
  email: "e2e-verified@example.com",
  password: "e2e-Password-123",
};

// Separate account for the logout test: Supabase's signOut() defaults to scope "global",
// which revokes every session of the user, including other tests running in parallel.
export const E2E_LOGOUT_USER = {
  email: "e2e-logout@example.com",
  password: "e2e-Password-123",
};

// Seed playground with every feature set (supabase/seed.sql), for deterministic detail pages.
export const SEEDED_PLAYGROUND = "Tivoli Park Playground";

export async function playgroundPath(name = SEEDED_PLAYGROUND) {
  const url = new URL("/rest/v1/playgrounds_geo", process.env.NEXT_PUBLIC_SUPABASE_URL);
  url.searchParams.set("select", "id");
  url.searchParams.set("name", `eq.${name}`);
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const res = await fetch(url, { headers: { apikey: key } });
  const [row] = (await res.json()) as { id: string }[];
  if (!row) throw new Error(`e2e: seed playground "${name}" not found — run pnpm db:reset`);
  return `/sl/playground/${row.id}`;
}

export async function login(page: Page, user = E2E_USER) {
  await page.goto("/sl/login");
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole("button", { name: sl.auth.submitLogin }).click();
  // Generous: several workers sign in at once against the local auth server.
  await expect(page).toHaveURL(/\/sl\/profile/, { timeout: 20_000 });
}
