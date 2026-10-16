import { createClient } from "@supabase/supabase-js";
import { E2E_ADMIN_USER, E2E_LOGOUT_USER, E2E_RESET_USER, E2E_USER } from "./fixtures";
import { startSentrySink } from "./sentry-sink";

// Creates the verified test users once per run. Refuses to touch anything but a local
// Supabase, because these tests create accounts and playgrounds.
export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error("e2e: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (see .env.local.example)");
  }
  const host = new URL(url).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`e2e: refusing to run against non-local Supabase (${host}). Point .env.local at \`pnpm db:start\`.`);
  }

  await waitForStack(url);

  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const user of [E2E_USER, E2E_LOGOUT_USER, E2E_RESET_USER, E2E_ADMIN_USER]) {
    const { error } = await admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { consent_privacy_at: new Date().toISOString(), age_confirmed: true },
    });
    if (error && !/already been registered|already exists/i.test(error.message)) throw error;
  }

  // Clients can't write is_admin (column grants); the service role can.
  const { data: users, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw listErr;
  const adminId = users.users.find((u) => u.email === E2E_ADMIN_USER.email)?.id;
  const { error: promoteErr } = await admin.from("profiles").update({ is_admin: true }).eq("id", adminId!);
  if (promoteErr) throw promoteErr;

  // Prove Auth actually issues sessions before tests start signing in.
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await anon.auth.signInWithPassword(E2E_USER);
  if (error) throw new Error(`e2e: test user cannot sign in: ${error.message}`);

  // Receives the app's error reports for the duration of the run; returned as teardown.
  return startSentrySink();
}

// `pnpm db:reset` restarts the Auth and REST containers after it reports success; requests
// that land during the restart hang. Wait until both answer quickly.
async function waitForStack(url: string, timeoutMs = 90_000) {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const probes = [`${url}/auth/v1/health`, `${url}/rest/v1/playgrounds_geo?select=id&limit=1`];
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const results = await Promise.all(
      probes.map((p) =>
        fetch(p, { headers: { apikey: key }, signal: AbortSignal.timeout(3_000) })
          .then((r) => r.ok)
          .catch(() => false),
      ),
    );
    if (results.every(Boolean)) return;
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error("e2e: local Supabase did not become ready — is `pnpm db:start` running?");
}
