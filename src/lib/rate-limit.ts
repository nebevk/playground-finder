import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "./supabase/admin";

// Rate limits for actions that create accounts, send email or call outside services (NFR-SEC-04).
// Adding playgrounds, reviews, reports and photos is limited in the database instead (migration
// rate_limits).
const LIMITS = {
  signup: { max: 5, windowSeconds: 60 * 60 },
  password_reset: { max: 5, windowSeconds: 60 * 60 },
  resend_verification: { max: 5, windowSeconds: 60 * 60 },
  // Searching by place calls a third-party geocoder (FR-MAP-10).
  place_search: { max: 60, windowSeconds: 60 * 60 },
} as const;
export type LimitedAction = keyof typeof LIMITS;

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

// Counts one attempt by this client (or account, for `subject`) and says whether it's allowed.
// The client is its IP address, kept only as a keyed one-way hash for at most a day (GDPR). Fails
// open: a broken limiter mustn't lock everyone out of signing up.
export async function withinRateLimit(action: LimitedAction, subject?: string): Promise<boolean> {
  let who = subject;
  if (!who) {
    // On Vercel the platform sets x-forwarded-for; no address (or this machine) means a local run.
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
    if (!ip || LOOPBACK.has(ip)) return true;
    who = `ip:${hash(ip)}`;
  }
  const { max, windowSeconds } = LIMITS[action];
  try {
    const { data, error } = await createAdminClient().rpc("consume_rate_limit", {
      p_key: `${action}:${who}`,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    return data !== false;
  } catch (err) {
    console.error("withinRateLimit: check failed", err);
    return true;
  }
}

function hash(value: string): string {
  return createHmac("sha256", process.env.SUPABASE_SECRET_KEY ?? "").update(value).digest("base64url").slice(0, 32);
}

// What the database raises when a person adds too much too fast (PostgREST: HTTP 429).
export function isRateLimited(error: { code?: string } | null | undefined): boolean {
  return error?.code === "PT429";
}
