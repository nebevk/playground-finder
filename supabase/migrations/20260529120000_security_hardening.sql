-- Security hardening: column-level write privileges + GDPR photo cascade.
-- Addresses the architecture review's critical/high findings #1–#4.
--
-- Design note: admins and content owners share the `authenticated` role, so column
-- privileges (which are role-wide) cannot distinguish them. We therefore:
--   1. Strip the `authenticated` role's ability to write sensitive columns
--      (is_admin, flagged, helpful_count) via PostgREST.
--   2. Keep SECURITY DEFINER triggers (auto_flag_on_reports, sync_review_helpful_count)
--      working — they run as the function owner, unaffected by these revokes.
--   3. Have admin Server Actions run as the service_role client (gated by requireAdmin()),
--      which bypasses both RLS and these column locks. See src/app/[locale]/admin/actions.ts.

-- ── #1: prevent privilege escalation via profiles.is_admin ──────────────────
-- Previously `profiles_update_own` allowed an authenticated user to PATCH any column
-- of their own row, including is_admin. Column privileges fix this at the SQL layer.
revoke update on public.profiles from anon, authenticated;
grant update (username, avatar_url) on public.profiles to authenticated;

-- ── #2/#3: flag + counter columns are trigger/admin-controlled only ─────────
-- Owners may still edit descriptive fields of their own rows (RLS owner policies),
-- but can no longer flip `flagged` (defeating moderation) or forge `helpful_count`.
revoke update on public.playgrounds from anon, authenticated;
grant update (
  name, description, location,
  is_fenced, has_shade, has_water, has_toilets, has_parking,
  surface_type, equipment
) on public.playgrounds to authenticated;

revoke update on public.reviews from anon, authenticated;
grant update (rating, comment) on public.reviews to authenticated;

-- Photos are immutable from the client; any flag/edit goes through the admin
-- (service_role) path. No UPDATE columns granted to authenticated.
revoke update on public.photos from anon, authenticated;

-- ── #4: account deletion must remove the user's photo rows (GDPR) ───────────
-- photos.user_id was ON DELETE SET NULL, so deleting a user left their photo rows
-- (and, separately, their Storage objects) behind. Switch to CASCADE so the rows go.
-- (Storage object files are removed explicitly in deleteAccountAction — no FK reaches them.)
alter table public.photos drop constraint if exists photos_user_id_fkey;
alter table public.photos
  add constraint photos_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
