# Deployment Guide

This is the end-to-end checklist to take the app from local dev to a public URL your friends can test.

Total estimated time the first time: **60–90 minutes**. After the first deploy, subsequent updates are a `git push`.

## Architecture

- **Application (Next.js):** hosted on **Vercel** (free tier is plenty for testing)
- **Database + Auth + Storage:** hosted on **Supabase** (free tier: 500 MB DB, 1 GB storage, up to 50k monthly active users)
- **Spam protection:** Cloudflare Turnstile (free, optional)
- **Domain:** Vercel gives you `<project>.vercel.app` for free. Custom domain optional.

---

## Step 0 — Pre-flight

- [ ] You have a GitHub account and the code is in a GitHub repo (create one if not: `gh repo create playground-finder --private --source=. --push`)
- [ ] You have accounts on: **Supabase** ([supabase.com](https://supabase.com)), **Vercel** ([vercel.com](https://vercel.com)), optionally **Cloudflare** ([cloudflare.com](https://cloudflare.com))

---

## Alternative: Cursor + MCP flow

If you use **Cursor**, you can skip a lot of clicking by adding the Supabase and Vercel MCP servers and letting the agent run the steps. This is an **alternative path** to Steps 1, 3, and 4 below — choose either, not both.

**One-time setup in Cursor:**

1. Open **Cursor → Settings → MCP** (or the `~/.cursor/mcp.json` file).
2. Add two servers:
   - **Supabase MCP** — official docs and install snippet at [supabase.com/docs](https://supabase.com/docs) (search "MCP"). You'll need a Supabase **personal access token** from your account settings; the server can be scoped to a single project ref for safety.
   - **Vercel MCP** — official docs at [vercel.com/docs](https://vercel.com/docs) (search "MCP"). Authenticates via your Vercel account.
3. Restart Cursor. The agent will see new tools like `supabase_apply_migration`, `vercel_deploy`, `vercel_set_env_vars`, etc.

**Then ask the agent:**

> "Provision a new Supabase project named `playground-finder` in eu-central. Enable PostGIS. Apply all migrations from `supabase/migrations/` and the `seed.sql`. Create the `playground-photos` storage bucket (public, 10 MB, image MIME types). Then deploy this repo to Vercel as a new project, set the env vars from `.env.local.example` using the Supabase project keys it just created, and return the deployed URL plus the SQL command I should run to promote my account to admin."

**What's still manual even with MCP:**

- Creating your Supabase / Vercel / Cloudflare **accounts** (one-time).
- Generating the **personal access tokens** the MCP servers need.
- Signing up on the deployed site with your email before you can promote yourself to admin.
- Cloudflare Turnstile keys (no Cloudflare MCP yet that I'd vouch for).

**Why you might still prefer the manual flow:**

- You want to see exactly what gets configured.
- You only deploy once and don't need the tooling overhead.
- You're sharing the procedure with non-Cursor-using collaborators.

If you go the MCP route, you can skip to **Step 2** below for Turnstile, then **Step 4** for the admin SQL command, and **Step 6** for the post-deploy checklist.

---

## Step 1 — Provision a Supabase project (~10 min)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Name it (e.g. `playground-finder`), set a strong DB password (save it in a password manager)
3. Region: **Frankfurt** (closest to Slovenia)
4. Plan: **Free**
5. Wait for the project to initialize (~2 min)

### 1a. Enable PostGIS

- Open **Database → Extensions** in the Supabase dashboard
- Search for `postgis` → enable it

### 1b. Apply migrations

You have two options:

**Option A (recommended) — via Supabase CLI (same tool as local):**
```bash
# Link the CLI to the remote project
pnpm supabase link --project-ref <your-project-ref>   # ref is in the dashboard URL
# Push all migrations + seed
pnpm supabase db push
```

**Option B — manual via the SQL editor:**
- Open **SQL Editor** in the Supabase dashboard
- Copy each file from `supabase/migrations/*.sql` in order, paste, **Run**
- Finally paste `supabase/seed.sql` (optional — only if you want the 10 Ljubljana samples)

### 1c. Create the storage bucket

- **Storage → Buckets → New bucket**
- Name: `playground-photos`
- **Public bucket**: ✓
- File size limit: 10 MB
- Allowed MIME types: `image/png, image/jpeg, image/webp`

(The storage RLS policies were applied by migration `20260416120009_storage.sql`.)

### 1d. Collect the keys

From **Project Settings → API**:
- `Project URL` → your `NEXT_PUBLIC_SUPABASE_URL`
- `anon` (or `publishable`) key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `service_role` (SECRET) → `SUPABASE_SECRET_KEY` — **never commit, never send to the client**

### 1e. Configure auth URLs

- **Authentication → URL Configuration**
- **Site URL**: `https://<your-project>.vercel.app` (update later if you use a custom domain)
- **Redirect URLs**: add `https://<your-project>.vercel.app/**`

### 1f. (Optional) Configure SMTP for real signup emails

The Supabase free tier has a very low email limit (~3/hour). For production, configure a real SMTP provider (SendGrid, Resend, Postmark — all have free tiers):
- **Authentication → SMTP Settings** → add your provider's credentials

Until then, you can disable email confirmation for testing: **Authentication → Providers → Email** → toggle "Confirm email" off.

---

## Step 2 — (Optional) Cloudflare Turnstile (~5 min)

- Go to [dash.cloudflare.com/?to=/:account/turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) → **Add Site**
- Domain: your Vercel URL (and `localhost` if you want it in dev)
- Widget mode: **Managed** (recommended)
- Save the **Site Key** (public) and **Secret Key** (private)

The `<Turnstile />` component already reads `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Server-side verification isn't wired yet — when you're ready, verify the token in `signupAction` and `createPlaygroundAction` by POSTing to `https://challenges.cloudflare.com/turnstile/v0/siteverify`.

---

## Step 3 — Deploy to Vercel (~10 min)

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import** your GitHub repo
3. Framework preset: **Next.js** (auto-detected)
4. **Environment Variables** — add these (use the "Production" scope):

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key from 1d>
SUPABASE_SECRET_KEY=<service_role key from 1d>
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<from step 2, or leave blank>
TURNSTILE_SECRET_KEY=<from step 2, or leave blank>
```

5. Click **Deploy**. First build takes ~3 min.
6. Visit the deploy URL — you should see `/sl` with the map and 10 seed playgrounds.

---

## Step 4 — Promote yourself to admin (~1 min)

Once you sign up on the deployed site:

1. Open **Supabase dashboard → SQL Editor**
2. Run:

```sql
update public.profiles
set is_admin = true
where id = (select id from auth.users where email = 'your-email@example.com');
```

3. Refresh `/sl/profile` in the app — you'll see an **Administracija / Admin** link
4. `/sl/admin` opens the dashboard with moderation + playground editor

---

## Step 5 — Share with testers (~1 min)

Send them the Vercel URL (e.g. `https://playground-finder.vercel.app/sl`).

They'll need to **sign up** with email/password. Keep an eye on the Supabase dashboard:
- **Authentication → Users** to see who signed up
- **Database → `public.playgrounds`** to see what they added

### Optional: invite-only mode

If you want signup to be invite-only during alpha:
- Supabase dashboard → **Authentication → Providers → Email** → disable "Enable signup"
- Then manually create accounts in **Authentication → Users → Invite user**

---

## Step 6 — Post-deploy checklist

- [ ] Anon user can browse the map (`/sl` shows markers)
- [ ] Signup works end-to-end (try it yourself, then check `auth.users` and `profiles`)
- [ ] Signup consent checkbox is enforced (submit without checking → blocked)
- [ ] Logged-in user can add a playground
- [ ] Uploading a photo works (Storage → `playground-photos` → see the file)
- [ ] Photos render on the detail page
- [ ] Delete account removes the user (check `auth.users`, `profiles`) — submitted playgrounds stay with `user_id = null`
- [ ] Export data downloads a JSON file
- [ ] Admin page is `404` for non-admins, accessible for admins
- [ ] Admin can edit/delete any playground
- [ ] 3+ reports flip `flagged=true` and hide the target from the map
- [ ] `/sl/privacy` and `/en/privacy` render the policy
- [ ] Cookie banner appears on first visit and dismisses to localStorage
- [ ] On mobile Chrome or Safari, "Add to Home Screen" prompts (PWA manifest)

---

## Ongoing updates

Every `git push` to your default branch triggers a new Vercel deploy automatically. Schema changes: add a new migration file under `supabase/migrations/` and run `pnpm supabase db push`. **Never edit an existing applied migration** — always create a new one.

---

## Known gaps before "true" production

These are deliberately left until after initial testing:
- **SMTP provider** for auth emails (free tier limit is tiny)
- **Custom domain** on Vercel (free, 2 clicks once you have a domain)
- **Turnstile server-side verification** (the widget renders but tokens aren't verified yet)
- **Observability**: Sentry / Axiom / Vercel Analytics
- **Database backups**: Supabase free tier has 7-day point-in-time recovery — fine for testing, consider upgrading before any real data matters
- **Content moderation for photos**: currently relies on user reports + admin review. At scale you'd want automated NSFW/face detection.
- **Rate limiting** on submissions (Turnstile helps, but add server-side limits too)
- **Playground view counter is ungated** — `increment_playground_views` is granted to `anon` with no dedup, so the public "Most popular" ranking is gameable by looping the RPC. Acceptable for alpha (impact is a reordered vanity list); when hardening abuse-resistance, dedup per session/IP (a `views` table with a unique key + `ON CONFLICT`) or switch the ranking to a less spammable signal.
- **Error pages** (a friendly `not-found.tsx` and `error.tsx`)

---

## Rollback

If a deploy breaks production:

- **Vercel dashboard → Deployments → pick a previous one → Promote to Production**

For a bad migration:

- Supabase does not support automatic down-migrations. Write a new forward migration that undoes the damage, then push it.
