# GDPR & ZVOP-2 requirements

**Must-read before touching auth, uploads or user data.** Conventions and the ID scheme are in [README.md](README.md). Status last reviewed **2026-10-14**.

## Why these rules exist

- **Lawful basis is consent.** Signup collects explicit, un-pre-checked consent to the Privacy Policy and Terms. Browsers and phones already ask permission for GPS.
- **Data minimisation.** Collect only what the app needs: an email and a username. No full name, no birthdate. Just a confirmation that the user is at least **15**, the age of digital consent in Slovenia under **ZVOP-2** (Slovenia's national supplement to GDPR).
- **Right to be forgotten and right of access.** Users must be able to delete their account and export their data themselves, without emailing anyone.
- **The photo problem is the highest risk.** Photos of public spaces are generally fine in Slovenia; photos of **identifiable children** without parental consent are a serious GDPR violation. The defence is layered: a warning at upload, a "privacy violation" report reason, Terms that make uploaders responsible, and admin review.
- **Slovenian first.** The audience is Slovenian, so the Privacy Policy must exist in Slovenian (English is a courtesy).
- **Technical security.** RLS ensures user A can never read or change user B's private data (see [NFR-SEC-01](non-functional.md#security-nfr-sec)).

## Requirements

| ID | Requirement | Pri | Status | Verify |
|---|---|---|---|---|
| GDPR-01 | Signup requires an **unchecked** "I agree to the Privacy Policy and Terms of Use" checkbox, enforced on the server. The consent time and policy version are stored with the account. | Must | Done | unit, e2e |
| GDPR-02 | Signup requires a self-declared age of 15 or older (ZVOP-2), enforced on the server. | Must | Done | unit |
| GDPR-03 | Data minimisation: an account stores only email, username and consent metadata. No real name, birthdate or phone number. | Must | Done | db |
| GDPR-04 | The public username does not reveal the user's email address. | Should | Partial — the username is the email's local part, and profiles are publicly readable | db |
| GDPR-05 | **Delete my account** removes the auth user, profile, reviews, photos (rows and storage files), favourites, reports and helpful votes. Playgrounds they submitted stay, anonymised (`user_id = null`). | Must | Done | db, manual |
| GDPR-06 | **Export my data** downloads JSON with the account, consent metadata, profile and all of the user's content, **including flagged items**. | Must | Done — owners can read their own flagged rows (ops 0006) | db, manual |
| GDPR-07 | The photo upload step shows, in Slovenian: *"Prosimo, ne objavljaj fotografij, na katerih so prepoznavni obrazi otrok."* (informal *ti*, like the rest of the app; was *objavljajte* until 2026-10-17) (English: "Please do not post photos with identifiable faces of children.") | Must | Done | unit, e2e |
| GDPR-08 | Report reasons include **privacy violation**. | Must | Done | db |
| GDPR-09 | Uploaded photos have EXIF metadata (including GPS) removed. | Must | Done — the browser always re-encodes and never sends an original; the server rejects files with EXIF/XMP; clients can't write to the bucket directly (ops 0003/0004, [ADR-0002](../adr/0002-photo-pipeline.md)) | unit, db |
| GDPR-10 | `/privacy` exists in `sl` and `en`. It names every processor (Supabase, Vercel, Cloudflare, Simple Analytics, Ko-fi), the map tile service (OpenStreetMap) and gives a monitored contact address for data requests. Every page links to it; on phones through the "Več" (*more*) menu in the bottom navigation. | Must | Done | unit, e2e |
| GDPR-11 | `/terms` says users are responsible for what they upload and must not upload photos of people without consent. | Must | Done | e2e |
| GDPR-12 | Only essential cookies, with a simple notice. No tracking cookies; any analytics are cookieless and listed on `/privacy`. | Must | Done | e2e |
| GDPR-13 | The user's GPS position is requested only when they act (Locate me, pin location) and is never stored. Only the playground's pinned location is saved. | Must | Done | e2e, manual |
| GDPR-14 | Flagged photos reported as a privacy violation stop being publicly downloadable as soon as they are flagged. | Must | Done — private bucket; no new URLs once flagged, and URLs already issued expire within 1 hour (ops 0003/0004) | db |
| GDPR-15 | When an admin deletes a photo or a playground, the photo **files** are deleted from storage too, not just the database rows. | Must | Done — ops 0003 | unit |
| GDPR-16 | User-uploaded photos are never used as link-preview (Open Graph) images: other platforms would cache copies beyond our moderation and deletion. | Must | Done — ops 0003 | e2e |

## Processors

| Processor | Purpose | Region / notes |
|---|---|---|
| Supabase | Database, auth, photo storage | Choose an EU region for the project |
| Vercel | Hosting, Vercel Analytics (cookieless) | |
| Cloudflare | Turnstile spam protection | |
| Simple Analytics | Visitor statistics (cookieless) | Third-party script loaded on every page |
| Ko-fi | Voluntary donations | External; only opened by the user |
| Sentry | Error reports: errors only, no IPs/cookies/user identity, one-time tokens scrubbed | EU region (`*.de.sentry.io`); listed on `/privacy` only when `NEXT_PUBLIC_SENTRY_DSN` is set |

## Implementation notes

- **Privacy Policy content.** A generator with a free tier (e.g. TermsFeed, iubenda) is fine for a hobby project. Keep the processor table above in sync with the `privacy.processors.*` i18n keys.
- **Contact address.** Set `NEXT_PUBLIC_PRIVACY_EMAIL` in Vercel to a dedicated, monitored inbox.
- **Consent versioning.** `CONSENT_POLICY_VERSION` in `src/app/[locale]/(auth)/actions.ts` must be bumped whenever the Privacy Policy or Terms change materially.
- **Account deletion.** `deleteAccountAction` removes storage files explicitly (no foreign key reaches them), then deletes the auth user, and FK cascades handle the rest.
