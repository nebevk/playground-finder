import { crc32, deflateSync } from "node:zlib";
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

// Admin account (profiles.is_admin is set by global-setup with the service role).
export const E2E_ADMIN_USER = {
  email: "e2e-admin@example.com",
  password: "e2e-Password-123",
};

// Separate account for password-reset tests, which change the password.
export const E2E_RESET_USER = {
  email: "e2e-reset@example.com",
  password: "e2e-Password-123",
};

// Local auth emails land in Mailpit (supabase/config.toml [inbucket]). Returns the first link
// in the newest email to `to` that arrived after `since`.
export async function emailLink(to: string, since: Date, timeoutMs = 15_000): Promise<string> {
  const api = "http://127.0.0.1:54324/api/v1";
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${api}/search?query=${encodeURIComponent(`to:"${to}"`)}&limit=1`);
    const [latest] = ((await res.json()) as { messages: { ID: string; Created: string }[] }).messages;
    if (latest && new Date(latest.Created) >= since) {
      const msg = (await (await fetch(`${api}/message/${latest.ID}`)).json()) as { HTML: string };
      const href = /href="([^"]+)"/.exec(msg.HTML)?.[1];
      if (href) return href.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`e2e: no email to ${to} arrived in Mailpit`);
}

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

// A valid RGB PNG of random noise. Noise doesn't compress, so the file size is about
// width × height × 3 bytes, a stand-in for a real phone photo after resizing.
export function noisePng(width: number, height: number) {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit, truecolour, no interlace
  const rows = Buffer.alloc((width * 3 + 1) * height);
  for (let i = 0; i < rows.length; i++) rows[i] = i % (width * 3 + 1) === 0 ? 0 : (Math.random() * 256) | 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export async function login(page: Page, user = E2E_USER) {
  await page.goto("/sl/login");
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole("button", { name: sl.auth.submitLogin }).click();
  // Generous: several workers sign in at once against the local auth server.
  await expect(page).toHaveURL(/\/sl\/profile/, { timeout: 20_000 });
}
