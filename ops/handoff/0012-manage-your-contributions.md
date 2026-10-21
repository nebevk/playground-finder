---
id: 0012
title: Add photos later, edit your review, "My contributions", write rules in the database
status: ready
order: migrations-first
destructive: false
migrations: [20261021090000_db_write_rules.sql]
checksums: [c088f17c806f30d3]
depends_on: []
backlog: [BL-17, BL-16, BL-14, BL-47]
requirements: [FR-ADD-06, FR-COM-07, FR-COM-02, NFR-SEC-07, FR-COM-01, FR-PG-01, FR-ADM-02, GDPR-07]
---

## Why

Group 1 of the owner's three: managing what you've added.

- **Add photos to an existing playground (FR-ADD-06, BL-17).**
  - Every playground page has "Dodaj fotografije" (*add photos*) next to its Photos heading, including when there are none yet.
  - The page uses the same picker as the add flow: the children's-faces disclaimer, camera or gallery, resizing on the device, and Turnstile.
  - Each person can add at most 8 photos per playground, in total over all their uploads.
  - Sign-up already promised "add photos later" to people who hadn't confirmed their email yet.
- **Edit your own review (FR-COM-02, BL-14).** Your review on a playground page has "Uredi mnenje" (*edit review*). It turns into the form, prefilled, with Save and Cancel. Delete is unchanged.
- **"Moji prispevki" (*my contributions*) on the profile (FR-COM-07, BL-16).**
  - It lists your playgrounds (each with "Uredi"), your reviews (each linking to that playground's reviews) and your photos, newest first.
  - Anything reported and hidden shows "V pregledu" (*under review*), without a link, under one note: "Prijavljene vsebine so skrite, dokler jih ne pregledamo." (*reported items are hidden until we review them*).
- **Write rules in the database (NFR-SEC-07, BL-47).** The publishable key, and so the API, is public. These rules were enforced by the app only; they now hold in the database too:
  - at most 8 photos per playground per person (trigger);
  - a playground name that isn't blank and is at most 120 characters (check constraint);
  - descriptions and review comments of at most 2,000 characters (check constraints).

  The forms now cap input at the same lengths.
- **Bug found on the way: reviews were never listed.**
  - Playground pages always said "Še ni mnenj" (*no reviews yet*), even though the rating in the header counted the reviews.
  - The admin's report list in `/admin/moderation` was always empty. The flagged items above it were unaffected.
  - Both queries embedded `profiles!inner(username)` in `reviews` and `reports`. Those tables reference `auth.users`, not `profiles`, so PostgREST answers "Could not find a relationship" and the code quietly showed nothing.
  - Usernames now come from a second query. No schema change is needed; usernames are already public (`profiles_select_all`).

## Changes

- **Migration `20261021090000_db_write_rules.sql` (expand-only):**
  - Trigger `photos_limit_per_person` (before insert on `photos`). It calls `private.enforce_photo_limit()`, a security definer with an empty `search_path`, which counts that person's photos of the playground, flagged ones included. It takes an advisory lock so parallel uploads can't race past 8, and raises `check_violation` (23514).
  - Check constraints `playgrounds_name_length`, `playgrounds_description_length` and `reviews_comment_length`. They are added `not valid` and then validated in the same migration only if no existing row breaks them. Production should have none; step 2 checks before applying.
- **Photos:**
  - New `src/lib/photo-upload.ts` (read and check the submitted photos; store them with undo on failure, mapping 23514 to "limit reached"), shared by the add flow and the new page.
  - New `src/components/Playground/PhotoPicker.tsx`; the add flow's step 3 now uses it.
  - New page `src/app/[locale]/playground/[id]/photos/` (noindex). Visitors who aren't signed in are sent to sign in.
  - New `addPhotosAction`.
  - The detail page always shows the Photos section, and a "Fotografije so dodane." toast after an upload.
- **Reviews:**
  - `updateReviewAction` uses the user's own client, so the owner-only update policy decides.
  - `ReviewForm` has an edit mode. New `OwnReview.tsx`, plus `ReviewBody.tsx` (a review as everyone sees it), which both the server list and `OwnReview` render.
  - The list has `id="reviews"` for the profile's links.
  - Stars are named "n od 5" (*n of 5*) and the comment box has a proper label.
- **Review and report lists:** new `usernamesById()` in `src/lib/profiles.ts`, used by `getReviewsForPlayground` and the moderation page. Both now log a failing query instead of hiding it.
- **One auth call per page render:** new `getCurrentUser()` in `src/lib/supabase/server.ts`, cached per request with React `cache()`. The playground page and its reviews section share it, so a page view or a save makes one fewer round trip to Supabase Auth. Under parallel e2e load, that round trip was the slowest step: up to 4.6 s on the local stack.
- **Profile:** new `src/lib/contributions.ts` and `src/components/Profile/MyContributions.tsx`. Photo URLs come from the new shared `signedPhotoUrls()` in `src/lib/playgrounds.ts`, under the same storage policy, so photos under review get no URL.
- **Limits:**
  - New `src/lib/limits.ts` (`NAME_MAX` 120, `DESCRIPTION_MAX` and `REVIEW_COMMENT_MAX` 2,000).
  - `maxLength` on the name, description and comment fields.
  - The admin quick-add, import and edit actions clamp to the same lengths.
- **i18n (sl + en):**
  - `detail.*`: addPhotos, photosAdded, editReview, saveReview, starLabel and `reviewError.too_long`;
  - `addPhotos.*`;
  - `profile.contributions.*`.
- **Tests:**
  - pgTAP `[NFR-SEC-07]`:
    - 8 photos are accepted and a 9th is refused;
    - a blank name, a 121-character name, a 2,001-character description and a 2,001-character comment are each refused.
  - e2e:
    - `[FR-ADD-06]` adds a photo to an existing playground; a visitor is asked to sign in;
    - `[FR-COM-01] [FR-COM-02] [FR-PG-01]` writes a review, edits it in place (the change survives a reload), and a visitor then sees it with its author's username;
    - `[FR-ADM-02]` a report appears in the moderation list with its reporter and reason;
    - `[FR-COM-07]` covers the empty state, then seeded playgrounds, a review and photos, with "V pregledu", links, edit link and touch targets.
  - Unit `[GDPR-07]` now checks that both photo screens use the picker that shows the disclaimer.
- **Docs:** FR-ADD-06, FR-COM-02, FR-COM-07 and NFR-SEC-07 are now Done; BL-14, BL-16, BL-17 and BL-47 are removed.

## Local verification (Claude Code)

- 2026-10-21: `pnpm test` 72 pass (1 todo). `pnpm test:db` 59 pass, including the new `[NFR-SEC-07]` checks: 8 photos accepted, a 9th refused, and the four text limits. `pnpm typecheck`, `pnpm lint`, `pnpm test:req` and `pnpm ops:check` pass.
- `pnpm test:e2e` (mobile and desktop):
  - 62 passed (2 known gaps skipped) twice in a row before the last refactor (`ReviewBody`).
  - On the final code: 62 passed, then 61. The one failure was the existing `[FR-ADD-08]` test: the "Uredi" link didn't open the edit page within 10 s. That run took 5.2 min instead of about 3, because the machine was busy.
  - After that, only a class change: the review form no longer draws a second card when editing in place.
- When the review journey runs 24 times in parallel, about 1 save in 6 leaves its form pending. Backlog BL-69 has the investigation.
- *Verify in production*, the step 2 pre-check and the step 6 query were run on the local stack, which has the same migrations: `0|0|0`; the trigger is present; all three constraints are validated. *Rollback*'s SQL was run inside a transaction that was rolled back.
- Checked by screenshot on a production build, at phone size:
  - "Moji prispevki" with both "V pregledu" states, the note, and the photo grid;
  - the add-photos page;
  - your own review with "Uredi mnenje" and "Izbriši mnenje";
  - editing in place.

## Production steps (Cursor)

1. Preflight. The working tree must be clean; the owner commits first, or asks Claude Code to.
2. **Pre-check (read-only).** Every number must be `0`:

   ```sql
   select
     (select count(*) from public.playgrounds where char_length(btrim(name)) not between 1 and 120) as bad_names,
     (select count(*) from public.playgrounds where char_length(description) > 2000) as long_descriptions,
     (select count(*) from public.reviews where char_length(comment) > 2000) as long_comments;
   ```

   If any number isn't `0`, record the row ids, set `blocked`, and stop without applying. A constraint left unvalidated still applies to every later update of those rows, and that includes the view counter and auto-flagging. Claude Code will write a fix first.
3. `apply_migration` with name `db_write_rules` and the exact file contents. It is safe before the push: the code in production already keeps to every rule. A name over 120 characters, or a comment over 2,000, would now get a generic "try again" from the old forms, and the new ones cap input.
4. Run *Verify in production* and confirm all expectations. If any fails, run *Rollback*'s SQL, set `failed` and stop.
5. Commit and push, then watch the deploy until it is `READY`. Smoke-test the `smokePaths`.
6. Pick a playground: `select id from public.playgrounds where not flagged limit 1;` (read-only). Then:
   - `curl -s <productionUrl>/sl/playground/<id> | grep -c "Dodaj fotografije"` → ≥ 1.
   - Reviews are listed again. First find a reviewed playground (read-only): `select r.playground_id, left(r.comment, 20) from public.reviews r join public.playgrounds p on p.id = r.playground_id where not r.flagged and not p.flagged and r.comment is not null limit 1;`. Then `curl -s <productionUrl>/sl/playground/<playground_id> | grep -c "<those 20 characters>"` → ≥ 1. If there are no reviews yet, record that; the owner test below covers it.
   - `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" <productionUrl>/sl/playground/<id>/photos` → a redirect to `/sl/login?next=…`. As with `/edit` in 0011, this can arrive as `200` with the redirect in the payload.
7. **Owner test on the phone** (record the result):
   - **Add photos:** open any playground and tap "Dodaj fotografije". The disclaimer is shown. Pick one or two photos and send them. You're back on the page with "Fotografije so dodane." (*photos added*), and the photos are there.
   - **Reviews are listed:** a playground you've reviewed now shows your review, with your username, under "Mnenja".
   - **Edit a review:** on it, tap "Uredi mnenje", change the stars and the text, then "Shrani mnenje" (*save review*). The review shows the new stars and text.
   - **Moderation (admin):** `/admin/moderation` lists open reports under the reports heading, each with "Prijavil: <username>" (*reported by*).
   - **Profile:** "Moji prispevki" lists your playgrounds with "Uredi", your reviews and your photos. "Uredi" opens the edit page.
8. `get_advisors` (`security`): no new findings expected; the new function lives in `private` with a fixed `search_path`. Record the result and set `status: done`.

## Verify in production

```sql
-- The photo limit trigger.
select tgname from pg_trigger
where tgrelid = 'public.photos'::regclass and tgname = 'photos_limit_per_person' and not tgisinternal;

-- The three text constraints, validated.
select conname, convalidated from pg_constraint
where conname in ('playgrounds_name_length', 'playgrounds_description_length', 'reviews_comment_length')
order by 1;
```

Expect:
- The first query returns 1 row.
- The second returns 3 rows, each with `convalidated = true`.

## Rollback

```sql
drop trigger if exists photos_limit_per_person on public.photos;
drop function if exists private.enforce_photo_limit();
alter table public.playgrounds
  drop constraint if exists playgrounds_name_length,
  drop constraint if exists playgrounds_description_length;
alter table public.reviews drop constraint if exists reviews_comment_length;
```

For the app, `git revert` the deploy commit and push. The two halves are independent: the new code keeps to the limits on its own, and the old code works with the rules in place.

## Result log (Cursor)

