# ADR-0002: Photo pipeline — server-validated uploads, private bucket, signed URLs

**Status:** Accepted (live since ops 0003/0004, 2026-10-16)
**Date:** 2026-10-16
**Deciders:** Nejc Bevk (owner)

## Context

Photos are the app's highest privacy risk: identifiable children, and GPS in metadata ([gdpr.md](../requirements/gdpr.md)). Checking the current pipeline turned up five problems:

1. **Multi-photo submissions fail (live bug).** The add flow sends every photo through one Server Action, and Server Actions accept **1 MB** by default. Four ordinary resized photos (~1.4 MB) fail with `Body exceeded 1 MB limit`; reproduced by the e2e test `[FR-ADD-03] several real-size photos…`. Production has 0 photos.
2. **GPS metadata can leak.** The browser re-encodes photos (which strips EXIF) except when the file is small, when re-encoding made it bigger, or when resizing threw. The server never inspects the bytes, and the API accepts direct Storage uploads that skip the browser entirely.
3. **Flagged photos stay public.** The bucket is public, so a reported photo is downloadable by URL forever.
4. **"Deleted" photos stay public.** Admin delete removes the database row but not the file, both for one photo and for a whole playground (`src/app/[locale]/admin/actions.ts`).
5. **User photos go to social caches.** The detail page uses the first photo as its Open Graph image, so link previews copy it onto other platforms' servers, out of our reach.

**Constraints:**
- Vercel Functions accept request bodies of at most **4.5 MB**.
- `next/image` isn't used for photos (plain `<img>`), so there are no optimizer copies to worry about.
- Supabase Storage supports public URLs, signed URLs (any expiry) and signed upload URLs. Image transformations need a paid plan.
- Ops 0002 already ties photo rows and files to the verified uploader's own folder.

## Decision

1. **The browser always re-encodes** each photo (≤ 1600 px, WebP, JPEG fallback). If that fails, the photo is refused with a message; the original is never sent. Budget: at most 8 photos and **3.5 MB in total**, checked in the browser and on the server.
2. **The server sees and validates every byte.**
   - `experimental.serverActions.bodySizeLimit = "4mb"`, below Vercel's 4.5 MB limit.
   - The Server Action checks the count, the total size and the per-file size (3 MiB). It checks the **magic bytes** (PNG/JPEG/WebP; the client-supplied MIME type isn't trusted) and **rejects files with embedded EXIF or XMP metadata**.
   - It then uploads with the **service role** to `<user id>/<playground id>/…`. Photo rows are still inserted with the user's own client, so the ops 0002 policies keep applying.
3. **Clients can't write to the bucket.** The Storage insert and update policies for users are dropped, so direct API uploads (and upserts) are impossible and every photo passes check 2.
4. **The bucket is private, and photos are served as 1-hour signed URLs.** Signed URLs are only issued for objects whose `photos` row is **not flagged**, enforced by a Storage select policy and created with the visitor's own client, not the service role. After a photo is flagged, no new URLs are issued and the existing ones expire within an hour.
5. **Deleting a photo or a playground deletes the files**, in the same admin action that deletes the rows. Account deletion already does this.
6. **User photos are never Open Graph images.** Pages fall back to the site-wide preview image.

## Options Considered

### Option A: Patch the current shape (raise the limit, always re-encode, delete files)

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | No change |
| Scalability | Same 4.5 MB ceiling as B |
| Team familiarity | High |

**Pros:** Smallest diff; fixes the bug and the deletion gap.
**Cons:** The bucket stays public, so flagged photos stay downloadable, and direct uploads still skip every byte-level check. Problems 2 and 3 remain.

### Option B: Server-validated uploads + private bucket + signed URLs — **chosen**

| Dimension | Assessment |
|---|---|
| Complexity | Medium. One storage policy, a byte-checking helper, a signed-URL batch call, file deletion in admin actions, two-step rollout. |
| Cost | No new services. Images are still served by Supabase's CDN; signing is one batch request per detail page. |
| Scalability | 8 photos / 3.5 MB per submission (Vercel body limit). Plenty for resized phone photos. |
| Team familiarity | High. Same Server Action and Supabase client. |

**Pros:** Closes all five problems. The database decides who can see a photo. Every stored byte passed server-side checks.
**Cons:** Photo URLs change on every render, so pages showing photos can't be cached longer than an hour. A photo already on someone's screen stays viewable for at most an hour after it's flagged. Uploads use the service role (narrow, validated path).

### Option C: Direct browser → Storage uploads via signed upload URLs

| Dimension | Assessment |
|---|---|
| Complexity | High. Signed upload URLs, post-upload validation (the server downloads each file), cleanup of abandoned uploads. |
| Cost | Lower Vercel bandwidth. |
| Scalability | No 4.5 MB ceiling. |
| Team familiarity | Medium |

**Pros:** Scales to large or many files.
**Cons:** The server doesn't see the bytes at upload time, so validation becomes a second round trip with a window where unvalidated files exist. Not needed for ≤ 8 resized photos. **Revisit** if limits grow (video, originals, more photos).

### Option D: Image proxy route (`/api/photos/[id]`) over a private bucket

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | Every image view becomes a Vercel Function invocation, with bandwidth through Vercel. |
| Scalability | Fine, but the cost grows with views. |
| Team familiarity | High |

**Pros:** Stable, cacheable URLs; revocation is instant, minus CDN TTL.
**Cons:** Pays per view for what Supabase's CDN does for free; CDN caching reintroduces a revocation delay. **Revisit** if the per-render URL churn conflicts with page caching ([ADR-0001](0001-map-data-loading.md) caches only the map, which has no photos).

## Trade-off Analysis

The real choice is between B and D: who serves a private photo. B lets Supabase's CDN serve it, with an access window of at most an hour, and costs nothing per view. D gives instant revocation but every view runs on Vercel. For an alpha with a moderation queue, a ≤ 1 h window after flagging is acceptable. A *deleted* photo (BL-03's real worry) is gone immediately, because the file itself is removed. C solves a scale problem the app doesn't have and weakens the guarantee that matters most: every stored byte was checked by the server.

## Consequences

- **Easier:** reasoning about privacy. A photo is viewable only while its row exists and isn't flagged, and every stored file passed byte-level checks. Users can add 8 photos again.
- **Harder:** pages with photos can't be cached for long, because signed URLs expire. Uploads depend on the service-role key being configured (already required for admin and account deletion).
- **Rollout (expand → contract):**
  - **ops 0003**: add the Storage select policy (expand), then deploy code that uploads with the service role and serves signed URLs. This works with the bucket still public.
  - **ops 0004**: make the bucket private and drop the client write policies (contract), after 0003's code is live.
- **Revisit when:** photo limits grow (Option C); pages with photos need long-lived caching (Option D); Supabase image transformations become available (thumbnails).

## Action Items

1. [x] Reproduce the 1 MB failure in e2e.
2. [x] Browser: always re-encode, refuse on failure, 3.5 MB total budget.
3. [x] Server: body limit 4 MB, total/type/metadata checks, service-role upload.
4. [x] Signed URLs for unflagged photos; no user photos in Open Graph.
5. [x] Admin deletes remove files.
6. [x] Migrations + tests + ops 0003 / 0004 (ready for Cursor).
