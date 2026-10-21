import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// A cookie-less client with the publishable key: it reads only what any visitor may read (RLS as
// `anon`), so what it returns can be cached once and shared by everyone (ADR-0001).
export function createAnonClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
