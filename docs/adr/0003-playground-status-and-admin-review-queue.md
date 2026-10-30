# ADR-0003: Playground publication status and admin review queue

**Status:** Accepted (owner, 2026-10-30), implemented in ops 0020. Two owner decisions are recorded under *Decision*: people's additions publish at once, and only discoveries wait.
**Date:** 2026-10-30
**Deciders:** Nejc Bevk (owner)
**Author:** Huston (PM). **Reviewed** by Claude Code on 2026-10-30 against the code at `58738f9`. What the review changed, and why, is under [*Review notes*](#review-notes-claude-code-2026-10-30).

## Context

Nejc wants a **daily discovery** flow that finds about two new playgrounds in Slovenia (via OpenStreetMap, not Google Maps), stages them for review, and only shows them on the public map after an admin approves them in the dashboard.

Today:

- `public.playgrounds` has **no publication status**. Every insert is public at once. The only way to hide a row is `flagged`, set by an admin or by the 3-reports trigger.
- **How hiding works:**
  - RLS `playgrounds_select_public` lets everyone read rows with `flagged = false`.
  - Two more select policies let the **author** read their own rows (`playgrounds_select_own`, ops 0006) and **admins** read every row (`playgrounds_select_admin_flagged`).
  - Signed-in authors and admins get more rows than visitors, so the public queries also filter `flagged = false` **explicitly**.
- **How writes are limited:**
  - Signed-in users write only the columns granted to them (column grants, ops 0014 and 0017). `flagged` is not one of them.
  - Admin Server Actions write with the service-role client, after `getAdminActionContext()` has checked `profiles.is_admin`.
  - Column grants apply to a whole role, and admins and authors share the `authenticated` role. So RLS can't let an admin write a column without letting the author write it too. This is the design note in `20260529120000_security_hardening.sql`.
- **Five ways to create a playground, all public at once:**

  | Path | Who | Client |
  |---|---|---|
  | `/add` (FR-ADD-*) | signed-in user | the user's own (RLS + column grants) |
  | `/admin/add`, quick add (FR-ADM-05) | admin | service role |
  | `/admin/import`, CSV import with a review step (FR-ADM-04) | admin | service role |
  | `scripts/import/push.ts`: scrape → `output/` → a human moves files to `approved/` → push, with `user_id = null` | owner, CLI | service role |
  | `supabase/seed.sql` | local only | postgres |

- `/admin` has:
  - a queue for **flagged** content (`/admin/moderation`);
  - a playgrounds table with an edit dialog (`/admin/playgrounds`, `EditPlaygroundForm`).

  Both moderate bad content. Neither is a discovery inbox.
- Prod (project `playground-finder` / `hwwaoistqfomdcjayiue`) had ~14 playgrounds as of 2026-10-30. Existing rows must stay visible after the migration.

**Where playgrounds are read publicly.** Each place must leave out unpublished rows:

| Surface | Reads | Client |
|---|---|---|
| Map, Home's lists, search, a playground's link-preview image | `getMapSnapshot()` and Home's `latestPlaygroundIds` / `mostViewedPlaygroundIds` ([ADR-0001](0001-map-data-loading.md)). Search runs in the browser over the snapshot; the preview image looks the playground up in it. | anon, cached and shared |
| Detail page, its edit and photos pages, their metadata; adding photos | `getPlaygroundById()`, `addPhotosAction` | the visitor's own |
| Sitemap | `playgrounds_geo` | anon |
| Photo files | The Storage read policy joins `playgrounds` | the visitor's own |
| RPCs | `playgrounds_near` (security invoker; only the admin quick add calls it) and `increment_playground_views` (returns nothing). Neither exposes rows. | — |

**Constraints:**

- The public map uses the cached, shared snapshot from [ADR-0001](0001-map-data-loading.md). A status filter must apply where the snapshot is built, not only on detail pages.
- GDPR and spam: automated inserts must not publish unchecked. Photos from Google Maps must **not** be scraped (terms of service and licensing). Discovery images are out of scope for v1 of this ADR: leave them empty, or let the community upload them later.
- Daily OSM automation is a **follow-up** (a Grok Bot routine that inserts as `pending`). This ADR covers only the schema, public filtering and the admin queue, so the automation has somewhere safe to land.

## Decision

1. **Add `playgrounds.status`** with the values `pending` | `published` | `rejected`.
   - The default is `published`, and every existing row is backfilled to it.
   - **Owner's decision (2026-10-30): people's additions publish at once, as today; only discoveries wait.**
     - FR-ADD-05 is unchanged: the person who adds a playground lands on the map, on its pin.
     - The discovery path must set `pending` itself, on the server. It never takes the status from whoever calls it.
2. **Who sets what:**
   - **Signed-in users can't write `status`** (no column grant). Their rows get the default, and they can't hide, reject or publish anything.
   - **The admin paths and `scripts/import/push.ts` keep inserting `published`:** a human already decided.
   - **Discovery inserts `pending`.**
3. **Who sees what.** RLS enforces it, and public queries also filter explicitly, as they do for `flagged`:
   - **Everyone:** `flagged = false and status = 'published'`.
     - The map snapshot, Home's lists, search, link previews, the sitemap and the detail page show nothing else, to anyone, admins included.
     - Photos can be added only to a published playground.
   - **The author:** their own rows in any status (the existing `playgrounds_select_own`). In v1 nobody's own rows can be pending or rejected.
   - **Admins:** every row (the existing admin policy). They review pending playgrounds in the queue, not on the public page.
4. **Review queue at `/admin/pending`.**
   - **What it lists:** pending playgrounds, newest first, with everything needed to decide:
     - the pin (on OpenStreetMap), and the OSM element itself for discoveries;
     - the description, features, surfaces and equipment;
     - the source and its notes;
     - existing playgrounds within 150 m, of any status.
   - **Actions:** **Publish**; **Edit**, then publish (the existing admin edit dialog); **Reject**.
     - In the queue's edit dialog, an **unticked feature stays unknown**, as in imports (`statedFeatures`). A reviewer at a desk can't say "no toilets", and the detail page would show "Brez …" (see ops 0018).
     - A short list of recently rejected playgrounds offers Publish, to undo a mistake.
   - **How it writes:** publish and reject are admin Server Actions that use the service-role client, like `flagged`. Both invalidate the map snapshot (ADR-0001).
5. **Reject** keeps the row, as `rejected`: discovery won't propose that playground again.
   - Pending playgrounds have no photos in v1: discovery brings none, and nobody can add any to an unpublished playground.
   - If a later source brings photos, rejecting must delete them, as GDPR-15 already requires when a playground is deleted.
6. **Provenance:**
   - `source`: `user` | `import` | `osm` | `other`. New rows default to `user`; both imports set `import`. Rows that existed before this are left null, because their origin can't be told reliably: rows without an author can be imports, or playgrounds whose author deleted their account.
   - `external_id`: for example `node/123`. It requires a `source`.
   - `source_notes`: a short note for the reviewer. Once the row is published, **anyone can read it through the API**, so it must hold only public facts.
   - A unique index on `(source, external_id)` where `external_id` is set.
7. **`status` and `flagged` stay separate.**
   - `status` answers "has an admin let it in?". `flagged` answers "was it taken down after reports?".
   - A published playground can still be flagged. A pending one can't be reported, because only admins can see it.

## Options considered

### Option A: File-only approval (extend `scripts/import` only)

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | None |
| Scalability | Poor for daily automation |
| Familiarity | High |

**Pros:** No schema change; it already works.
**Cons:**
- No in-app queue, and Nejc asked for approval in the admin dashboard.
- Automated inserts would still need a status in the database, or stay offline as JSON forever.

### Option B: `status` column + admin queue — **chosen**

| Dimension | Assessment |
|---|---|
| Complexity | Medium (migration, RLS, the map snapshot, admin UI, i18n, tests) |
| Cost | None beyond engineering |
| Scalability | Fits daily OSM inserts and, if ever wanted, user submissions |
| Familiarity | High (extends the existing admin and the `flagged` pattern) |

**Pros:** Matches the product ask; one place to approve; a safe place for automation to land.
**Cons:** Every public read must filter `status`, and publishing must invalidate the map snapshot. The public reads are listed under *Context*.

### Option C: Separate `playground_drafts` table

| Dimension | Assessment |
|---|---|
| Complexity | Higher |
| Cost | None |
| Scalability | Fine |
| Familiarity | Lower |

**Pros:** Keeps the public table "clean".
**Cons:** A duplicate shape, a copy on approve, more UI. Unnecessary while volume is tiny.

### Option D: Reuse `flagged` (insert discoveries already flagged)

| Dimension | Assessment |
|---|---|
| Complexity | Lowest |
| Cost | None |
| Scalability | Fine |
| Familiarity | High |

**Pros:** No schema change. The hiding rules and the moderation queue already exist.
**Cons:**
- It puts "new, not checked yet" and "reported by three people" in one queue, and approving there deletes the reports.
- There is no rejected state, so a declined OSM playground would be proposed again the next day.

## Trade-off analysis

**B over the others:**
- B keeps one table and one admin surface. It costs a status filter on every public read and an invalidation on publish. Both follow patterns that already exist (`flagged`, ADR-0001).
- A drafts table (C) is overkill at this scale.
- Reusing `flagged` (D) mixes two queues with different meanings.
- File-only approval (A) fails the dashboard requirement.

**User submissions publish at once** (the owner's decision). The community add flow keeps its spam defences: Turnstile, sign-in, rate limits, reports and the 3-reports auto-flag. If spam ever gets through them, the same queue can take user submissions too:
- change the column default to `pending`;
- land `/add` on the submitter's own page instead of the map (FR-ADD-05);
- let the author see their pending playground's page.

**Admin paths and `import:push`** insert **`published`**:
- the admin is the reviewer;
- files in `approved/` were already checked by a human.

Discovery automation inserts **`pending`** with `source = 'osm'`.

## Consequences

- **Easier:**
  - safe daily discovery;
  - admins have an inbox;
  - the public map stays curated;
  - nothing about adding a playground changes for people.
- **Harder:**
  - every public query filters `status = 'published'`;
  - publishing must invalidate the map snapshot (ADR-0001);
  - a new automated insert path must remember to set `pending`, because the default publishes.
- **Accepted for v1:**
  - **People's additions aren't reviewed**, as today.
  - **Home's "Novo" list sorts by `created_at`.** A discovery approved days after it was found sorts that many days back. Add `published_at` if it matters.
  - **Duplicates of waiting discoveries.** Someone can add a playground that is already waiting in the queue: the add flow's duplicate warning (FR-ADD-02) only sees published ones. The queue lists nearby playgrounds, so the reviewer rejects the discovery as the duplicate.
  - **Edits made in the queue can only add features, not deny them.** An unticked box stays unknown there. The `/admin/playgrounds` editor still saves an unticked box as "no" (backlog BL-71).
- **Follow-up (not this ADR):** a Grok Bot weekday/daily routine:
  - queries Overpass for `leisure=playground` in Slovenia;
  - skips playgrounds already in the database;
  - inserts 2 as `pending`;
  - pings Nejc with admin links.

  No Google Maps scraping and no automatic photos in v1. Constraints on it (backlog BL-70):
  - **Never give the routine the service-role key.** It bypasses RLS on every table. Give it a narrow, secret-protected endpoint instead (for example `POST /api/discoveries`). The endpoint:
    - checks each row: inside Slovenia, field lengths, a daily cap;
    - inserts it as `pending`, with `source = 'osm'`, using the server's own service-role client.
  - **Dedupe against every row, pending and rejected included.** Match by `external_id` and by distance: OSM ids change when a mapper redraws a feature.
  - **OSM data is ODbL.**
    - Credit OpenStreetMap wherever OSM-derived data is shown, for example on the detail page of a `source = 'osm'` playground.
    - Be ready to share the OSM-derived rows under ODbL. `source` keeps them identifiable.
    - Confirm the obligations before the routine ships.
- **Revisit when:** volume needs bulk approve; drafts need multi-step enrichment before publish; or people's additions need review after all.

## Schema (as built: `20261030120000_playground_status.sql`)

```sql
-- Existing rows and every insert that doesn't say otherwise are published.
alter table public.playgrounds add column if not exists status text not null default 'published';
alter table public.playgrounds
  add constraint playgrounds_status_known check (status in ('pending', 'published', 'rejected'));

-- Provenance. Added without a default so existing rows stay null (origin not recorded); new rows
-- default to 'user'. Imports and discovery set their own.
alter table public.playgrounds
  add column if not exists source text,
  add column if not exists external_id text,
  add column if not exists source_notes text;
alter table public.playgrounds alter column source set default 'user';
-- plus checks: the known sources; an external_id needs a source (≤ 100 characters);
-- source_notes ≤ 1000 characters
create unique index if not exists playgrounds_source_external_id_uidx
  on public.playgrounds (source, external_id) where external_id is not null;

-- Visitors: published and unflagged. Authors (playgrounds_select_own) and admins
-- (playgrounds_select_admin_flagged) keep their policies.
drop policy if exists "playgrounds_select_public" on public.playgrounds;
create policy "playgrounds_select_public" on public.playgrounds
  for select using (flagged = false and status = 'published');

-- playgrounds_geo: status, source, external_id, source_notes appended (create or replace can only
-- add columns at the end). No insert or update grants on the new columns for authenticated.
```

No index on `status`. It has three values, almost every row is `published`, and the table is small, so the planner wouldn't use one.

**Access, and how it's enforced:**

- **Read:**
  - `playgrounds_select_public` as above. The author and admin policies stay.
  - Public queries add `.eq("status", "published")` next to their `flagged` filter. That way an admin's signed-in client never shows a pending playground on a public page.
- **Write:**
  - `authenticated` gets **no** insert or update grant on `status`, `source`, `external_id` or `source_notes`. Signed-in users can neither publish nor hide anything.
  - Publish and reject are admin Server Actions with the service-role client. No new admin policy or RPC is needed. Column grants apply to the whole role, so a policy couldn't let admins write `status` without letting authors write it too.
- **Photo files:** no change. The Storage read policy joins `playgrounds` under the visitor's RLS, so only admins could get links to an unpublished playground's photos.

## Action items (Claude Code)

1. [x] **Migration** `20261030120000_playground_status.sql`: expand-only, the schema above. pgTAP checks:
   - the default is `published`;
   - the status values and the provenance rules hold;
   - visitors and signed-in users see no pending or rejected rows, in the table or the view, while admins do;
   - signed-in users can't set or change `status` or `source`.
2. [x] **Insert paths:**
   - `/admin/import` and `scripts/import/push.ts` set `source: 'import'`. The other paths keep the default, `published`.
   - The seed adds one pending OSM discovery for the queue.
3. [x] **Public reads:** `.eq("status", "published")` in:
   - the snapshot;
   - Home's two lists;
   - `getPlaygroundById`;
   - adding photos;
   - the sitemap.

   The snapshot's shape doesn't change, so its cache key stays.
4. [x] **Review queue** `/admin/pending` (sl + en), with publish, edit (where an unticked feature stays unknown) and reject. Below the queue, recently rejected playgrounds, each with publish.

   Elsewhere in admin:
   - the dashboard shows the waiting count and links to the queue;
   - `/admin/playgrounds` and `/admin/quality` list published playgrounds only.
5. [x] **Tests:**
   - pgTAP: as in item 1.
   - Unit:
     - the new action invalidates the map;
     - the database's status and source lists match the app's;
     - the OSM link helpers.
   - e2e:
     - a waiting discovery has no page and isn't in the sitemap;
     - the admin publishes one from the queue, and visitors then see it on the map while another waiting one stays off;
     - rejecting moves a discovery to the rejected list, and publishing from there undoes it;
     - an edit in the queue keeps unanswered features unknown.
6. [x] **Docs and ops:**
   - FR-ADM-07 (the queue) and FR-ADM-08 (status and who sees it); FR-ADM-03 lists published playgrounds.
   - Backlog BL-70 (the discovery routine and its constraints) and BL-71 (the admin editor's "unticked = no").
   - `pnpm db:types`.
   - Ops ticket 0020 (migrations-first).
7. [ ] Leave the OSM routine to Huston (BL-70; see the follow-up constraints under *Consequences*).

## Out of scope

- Implementing the daily Grok Bot / Overpass routine.
- Scraping Google Maps or copying Google photo bytes.
- Automatic face or NSFW screening (see backlog BL-28).
- Changing the file-based `scripts/import` scrape pipeline beyond recording its source.
- Reviewing people's additions (the owner's decision; see *Trade-off analysis* for how it would be switched on).

## Review notes (Claude Code, 2026-10-30)

The direction (Option B) held. What the review found, and how each point was settled:

1. **The default and the decision disagreed.** The sketch defaulted `status` to `published`, but decision 2 had user submissions insert `pending`. Users have no grant on `status`, so the default decides. Asked to choose, the owner kept people's additions instant. So the default stays `published`, and discovery sets `pending` itself.
2. **"Admins update status through RLS" can't work here.** Column grants apply to a whole role, and admins share `authenticated` with authors. A grant that let admins write `status` would let authors publish or hide their own playgrounds. Publish and reject use the service-role admin actions, like `flagged`. No admin policy and no approve RPC are needed.
3. **Two live insert paths were missing:** `/admin/add` and `/admin/import`. With the `published` default they need no change. The CSV import records `source = 'import'`.
4. **"Non-deleted rows" is really `flagged`.** There is no soft delete. Public reads filter `flagged` explicitly, because signed-in clients get more rows. `status` follows the same pattern. *Context* now lists every public read, including the link-preview image (through the snapshot), photo files (through the Storage policy) and adding photos.
5. **The author's view of their own pending playground** (profile only, or also its page) no longer applies: people's additions don't wait. The detail page is published-only, for everyone.
6. **Approving would publish photos too.** Pending rows can't have photos in v1. Rejecting must delete them if a future source brings any (GDPR-15).
7. **Reusing `flagged`** (Option D) is the obvious cheaper alternative. It was missing; it's now listed, with the reasons against it.
8. **FR-ADD-05** ("lands on the map focused on the new playground") would have conflicted with reviewing user submissions. The owner's decision keeps it as it is.
9. **The queue's edit dialog would have invented "Brez …"** for every feature a discovery doesn't state. The admin editor saves an unticked box as "no". In the queue, an unticked box now stays unknown.
10. **`source` isn't backfilled.** Rows without an author can be imports, or playgrounds whose author deleted their account. The plain index on `status` is dropped.
11. **Constraints for the follow-up routine:** no service-role key; dedupe against every status; OSM's ODbL licence.
