---
id: 0020
title: Discovered playgrounds can wait in a review queue until an admin publishes them
status: blocked
order: migrations-first
destructive: false
migrations: [20261030120000_playground_status.sql]
checksums: [b5454320df4a2816]
depends_on: [0019]
backlog: []
requirements: [FR-ADM-07, FR-ADM-08, FR-ADM-03, NFR-SEC-05]
---

## Why

- **The ask.** The owner wants a daily discovery that finds about two OpenStreetMap playgrounds and shows them only once an admin approves them in the dashboard ([ADR-0003](../../docs/adr/0003-playground-status-and-admin-review-queue.md), accepted 2026-10-30).
- **The gap.** Until now every insert was public at once, so automation had nowhere safe to land. This ticket adds that place: a publication status and the review queue.
- **The owner's decision (2026-10-30):** people's additions stay instant, as today. Only discoveries wait.
- **Not here:** the discovery routine itself (backlog BL-70).

## Changes

- **Migration `20261030120000_playground_status.sql`** (expand-only):
  - **`status`**: `pending`, `published` or `rejected`. The default is `published`, and every existing row becomes `published`.
  - **Provenance: `source`, `external_id`, `source_notes`.**
    - `source` is `user`, `import`, `osm` or `other`. Existing rows stay null; new rows default to `user`.
    - An `external_id` needs a `source`. One row per `(source, external_id)`, whatever its status, so a rejected discovery can't come back.
    - It's a plain unique index, not a partial one. Rows without an id never clash, because nulls are distinct. Only a plain index can settle an upsert, so discovery can add rows idempotently. Found while setting up a local demo.
  - **`playgrounds_select_public`** becomes `flagged = false and status = 'published'`. The author and admin policies are unchanged.
  - **`playgrounds_geo`** gets the four columns appended.
  - **No insert or update grants on the new columns for `authenticated`.** Only the admin actions (service role) change them.
- **Public reads** filter `status = 'published'` explicitly, next to `flagged = false`:
  - the map snapshot;
  - Home's two lists;
  - the detail page, its edit and photos pages, and their metadata;
  - adding photos;
  - the sitemap.

  Search and link previews read the snapshot. The snapshot's shape and cache key are unchanged.
- **Review queue `/admin/pending`** (sl + en). Each waiting playground shows:
  - its pin on OpenStreetMap, and the OSM feature it came from;
  - what it lists (features, surfaces, equipment) and the source's notes;
  - playgrounds of any status within 150 m.

  *Objavi* publishes it and refreshes the map. *Uredi* opens the admin edit dialog, where unticked features stay unknown, not "Brez …". *Zavrni* rejects it. Recently rejected playgrounds can still be published.
- **Elsewhere in admin:**
  - the dashboard shows the waiting count, which links to the queue;
  - `/admin/playgrounds` and `/admin/quality` list published playgrounds only;
  - the CSV import and `scripts/import/push.ts` record `source = 'import'`;
  - **the edit dialog's opening button is now a real button**, in the table and in the queue. It used to be `display: contents` around a styled span, which has no box: it can't be clicked by tests and isn't reliably focusable or announced. Found by the new e2e test.
- **Seed:** one waiting OSM discovery, "Igrišče Rožna dolina".
- **Docs:**
  - ADR-0003 accepted, with review notes;
  - new FR-ADM-07 and FR-ADM-08;
  - FR-ADM-03 and NFR-SEC-05 extended;
  - backlog BL-70 (the discovery routine, with its constraints) and BL-71 (the admin editor saves unticked as "no").

## Local verification (Claude Code)

- **2026-10-30, all checks:**
  - `pnpm db:reset` applies cleanly.
  - `pnpm test:db`: 112 pass, including 22 new checks in `30_publication.test.sql`. The GDPR-04 TODO is unchanged. (Re-run after the index change.)
  - `pnpm test`: 111 pass (was 99).
  - `pnpm typecheck`, `pnpm lint` and `pnpm test:req` pass.
- **`pnpm test:e2e`: 78 passed, none skipped.** The 5 new tests are in `review-queue.spec.ts`. The first run failed 3 tests, all fixed:
  - the edit dialog's opening button couldn't be clicked (`display: contents`; see *Changes*);
  - a test locator also matched the closed edit dialog's labels;
  - the test discoveries sat about 40 m from Tivoli, and once published they beat Tivoli in the desktop "near me" test. They now go to Novo mesto, where no test stands.
- ***Verify in production*, run on the local stack:** every result as expected, except `with_source`. Locally it counts the seed's rows, because the seed runs after the migration. In production, existing rows have no source.

## Production steps (Cursor)

1. Preflight. The working tree must be clean, and 0019 must be `done`.
2. **Pre-check (read-only):**

   ```sql
   select count(*) as playgrounds, count(*) filter (where flagged) as flagged from public.playgrounds;
   ```

   Record both numbers.
3. `apply_migration` with name `playground_status` and the exact file contents. It's safe before the push:
   - the code in production never sets the new columns;
   - every existing row becomes `published`, and so does every new insert (the default);
   - so the old code sees and does exactly what it did before.
4. Run *Verify in production*. If anything differs, set `failed` and stop without pushing.
5. Commit and push, watch the deploy until it is `READY`, and smoke-test the `smokePaths`. Also check that `/sl/admin/pending` answers **404** to a visitor (FR-ADM-01).
6. **Owner, on the phone:**
   - `/sl/admin` shows "Čaka na pregled: 0" first, and the "Nova igrišča za pregled" link;
   - the queue says "Nobeno igrišče ne čaka na pregled.";
   - adding a playground at `/sl/add` still lands on the map, on its pin, as before.
7. `get_advisors` (`security`): record any warning that wasn't in 0019's log. Then set `status: done`.

## Verify in production

```sql
-- The columns, their defaults and whether they may be empty.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'playgrounds'
  and column_name in ('status', 'source', 'external_id', 'source_notes')
order by column_name;

-- Every playground by status; how many have a source.
select status, count(*) as playgrounds, count(source) as with_source
from public.playgrounds
group by status
order by status;

-- Visitors see published, unflagged playgrounds only.
select qual
from pg_policies
where schemaname = 'public' and tablename = 'playgrounds' and policyname = 'playgrounds_select_public';

-- The constraints and the unique index.
select conname
from pg_constraint
where conrelid = 'public.playgrounds'::regclass
  and conname in ('playgrounds_status_known', 'playgrounds_source_known', 'playgrounds_external_id_sourced',
                  'playgrounds_source_notes_length')
order by conname;
select indexdef from pg_indexes
where schemaname = 'public' and indexname = 'playgrounds_source_external_id_uidx';

-- The view the map reads carries the new columns.
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'playgrounds_geo'
  and column_name in ('status', 'source', 'external_id', 'source_notes')
order by column_name;

-- Signed-in users can't write the new columns.
select column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'playgrounds' and grantee = 'authenticated'
  and column_name in ('status', 'source', 'external_id', 'source_notes')
  and privilege_type in ('INSERT', 'UPDATE');
```

Expect:
- **Columns:** 4 rows, in this order:
  - `external_id | text | YES | ` (no default);
  - `source | text | YES | 'user'::text`;
  - `source_notes | text | YES | ` (no default);
  - `status | text | NO | 'published'::text`.
- **By status:** exactly one row, `published | <pre-check count> | 0`. Existing rows have no source.
- **Policy:** `qual` = `((flagged = false) AND (status = 'published'::text))`.
- **Constraints:** 4 rows:
  - `playgrounds_external_id_sourced`;
  - `playgrounds_source_known`;
  - `playgrounds_source_notes_length`;
  - `playgrounds_status_known`.
- **Index:** `CREATE UNIQUE INDEX playgrounds_source_external_id_uidx ON public.playgrounds USING btree (source, external_id)`.
- **View:** 4 column names.
- **Grants:** no rows.

## Rollback

- **Code:** `git revert` the commit and push. This is safe with the migration in place: the default publishes, and the old code never sets the new columns.
- **Schema:** leave it. If it must go, get the owner's confirmation first. Under the old policy every waiting and rejected discovery would become public, so the rollback removes them before restoring the policy:

  ```sql
  delete from public.playgrounds where status <> 'published';
  drop policy if exists "playgrounds_select_public" on public.playgrounds;
  create policy "playgrounds_select_public" on public.playgrounds for select using (flagged = false);
  ```

  The columns and the view can stay; nothing else reads them.

## Result log (Cursor)

- **2026-10-30T14:29Z** started. Preflight OK (0019 done, prod READY, migration not in prod). Pre-check: playgrounds=15, flagged=0. Applying `playground_status`.
- **2026-10-30T14:30Z** applied (prod version `20261030143032`). Verify: columns/defaults match; published|15|0; policy flagged+status; 4 constraints; unique index; geo 4 cols; no authenticated grants. Pushing `4ae4f80`..`9168f64`.
- **2026-10-30T14:32Z** deploy `dpl_4ng5G6k6b8SVjtjGENZnRrnsoUbQ` READY on `de201b1`. Smoke 200. `/sl/admin/pending` → 404 for visitors. Advisors unchanged vs 0019.
- **Blocked** on owner phone: `/sl/admin` shows "Čaka na pregled: 0" + queue link; queue empty message; add flow still lands on the map pin. Say **process ops** when done.
