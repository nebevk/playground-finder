import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Server-only. Uses the service role key — never expose this in a client component.
// Use for privileged operations like deleting auth.users or bypassing RLS for exports.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Supabase admin client not configured");

  return createClient<Database>(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
