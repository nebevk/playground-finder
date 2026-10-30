# Claude handoff: pending status + admin review queue

**For:** Claude Code session on `playground-finder`  
**From:** Huston (2026-10-30)  
**Repo (local):** `C:\Users\Nejc\Desktop\dev\playground-finder`  
**Repo (GitHub):** https://github.com/nebevk/playground-finder  
**Prod:** https://playground-finder-seven.vercel.app — Supabase project `playground-finder` (`hwwaoistqfomdcjayiue`)  
**Decision record:** [docs/adr/0003-playground-status-and-admin-review-queue.md](adr/0003-playground-status-and-admin-review-queue.md) (Status: Proposed)
**Reviewed 2026-10-30 (Claude Code):** the ADR was corrected against the code. Where this handoff and the ADR differ, the ADR wins (see its *Review notes*).

## Goal

Ship **publication status** (`pending` / `published` / `rejected`) and an **admin review queue** so automated OSM discoveries (and preferably user submissions) wait for Nejc’s approval before appearing on the public map.

Do **not** build the daily OpenStreetMap discovery routine in this task. Huston will add that after this lands.

## Why

Nejc asked for a daily “add ~2 playgrounds” automation with admin approval. Google Maps scraping is rejected (ToS, fragility, photo licensing). OSM Overpass fits the existing Leaflet/OSM stack. The app currently has no pending state — inserts go live immediately.

## Current anchors (read these first)

- Admin: `/admin`, `/admin/moderation`, `/admin/playgrounds`, `profiles.is_admin`, admin actions under `src/app/[locale]/admin/`
- Map data loading: ADR-0001 (cached snapshot — must respect `status`)
- Import pipeline: `scripts/import/` (`scrape` → `output/` → human → `approved/` → `push.ts`)
- Conventions: `CLAUDE.md`, `docs/requirements/`, `docs/backlog.md`, ops handoff style in `ops/handoff/`

## Implement

### 1. Schema

- Add `status text not null` with check `pending | published | rejected`.
- Backfill existing rows → `published`.
- Recommended: `source`, `external_id`, `source_notes` + unique partial index on `(source, external_id)`.
- Update RLS so public read = `published` only; admins read/update all; only admins (or approve RPC) can publish/reject.

### 2. Public app

- Map snapshot / queries, search, detail, sitemap, RPCs: **only published**.
- Approving a playground must refresh whatever ADR-0001 uses so the map updates.

### 3. Admin review queue

- New page or section under `/admin` listing `status = 'pending'` (newest first).
- Show: name, map/coords, description, features/equipment, source + external_id + notes if present.
- Actions: **Approve** → `published`, **Reject** → `rejected`, **Edit** then approve.
- i18n: `sl` + `en`.
- Optional: filter/tab for `rejected`.

### 4. User add flow

- Prefer insert as `pending` + clear “awaiting review” UX; submitter may see own pending on contributions/profile.
- If you keep instant publish for users, document why in the PR (discovery still uses pending).

### 5. Import script

- `scripts/import/push.ts`: keep inserting **`published`** (approved folder = already reviewed).
- Do not require moving import to pending unless Nejc asks.

### 6. Tests & ship

- DB/unit/e2e: public excludes pending; admin approve works; old playgrounds still listed.
- Regenerate types (`pnpm db:types` or project equivalent).
- Add backlog item + `ops/handoff/NNNN-…` when migration is ready for Cursor/prod.
- Update `docs/adr/README.md` table row for ADR-0003 when accepting (owner sign-off).

## Done when

- [ ] Migration applied locally; existing playgrounds still on the map as published.
- [ ] Pending playgrounds invisible to non-admins on map/search/detail/sitemap.
- [ ] Admin can approve/reject from a dedicated queue.
- [ ] Tests green for the above.
- [ ] PR (or local branch) ready; ADR stays Proposed until Nejc accepts.

## Explicit non-goals

- Overpass / daily routine / Grok Bot automation.
- Google Maps scrape or Google photos.
- Changing photo pipeline (ADR-0002).
