---
id: 0019
title: Every public page links its sl and en versions; the sitemap stops showing a year-old list
status: ready
order: any
destructive: false
migrations: []
checksums: []
depends_on: [0018]
backlog: [BL-22]
requirements: [NFR-SEO-02, NFR-SEO-01]
---

## Why

1. **BL-22 / NFR-SEO-02.** Search engines couldn't tell that `/sl/map` and `/en/map` are the same page in two languages, so they could list the wrong one or treat them as duplicates. Only the detail, about and terms pages had their own title, and only the detail page had its own description.
2. **Found while verifying: the sitemap was frozen (NFR-SEO-01).** Next cached the sitemap's playground query for a year (`revalidate: 31536000`, first cached locally on 2026-10-15). Every build reused it, so the sitemap listed playgrounds deleted since then (they answer 404) and never listed new ones. Vercel keeps that cache between builds and deployments, so production is very likely affected too.

## Changes

- **`src/lib/seo.ts` (new):**
  - `PUBLIC_PATHS`: the pages search engines should list (Home, map, about, privacy, terms), plus each playground's page. The sitemap uses the same list.
  - `localeAlternates(locale, path)`: the page names itself as canonical and links `sl`, `en` and `x-default` (Slovenian).
  - `NOT_LISTED`: `noindex, follow`.
- **Public pages:** each sets its own title, its own description, and `localeAlternates`.
  - Home: the app's name stays its title.
  - A playground with no description gets one made from its name ("{name}: ocene staršev, fotografije, igrala …").
  - New `meta.*` messages (sl + en) hold the descriptions for Home, the map and about. Privacy and terms reuse their intros.
- **Alternates are set per page, never in the layout.** Inherited from the layout, every other page would name Home as its canonical, which tells search engines they're copies of Home.
- **Sign-in, sign-up, forgot and reset password, profile and adding** now have their own tab title (for example "Prijava · …") and `noindex`. Search already had `noindex`.
- **Sitemap:**
  - each entry also lists its language versions (`xhtml:link hreflang`);
  - `export const revalidate = 3600`: rebuilt at most hourly, the same bound as the map snapshot.
- **Docs:** NFR-SEO-02 is Done; NFR-SEO-01 notes the sitemap fix; BL-22 is removed. BL-40 now lists only `server.ts` (`ce1bf2f` already covered `admin.ts`).
- **Tests:**
  - unit: the alternates helper; the public page list; the sitemap's revalidation (at most an hour).
  - e2e:
    - all 6 public pages × 2 languages: exactly one canonical (itself) and sl/en/x-default alternates; every page has a title and description of its own, distinct from the others;
    - sign-in, sign-up, forgot password and search have no canonical and `noindex`;
    - the sitemap carries hreflang for pages and playgrounds.

    These replace the `test.fixme` for NFR-SEO-02.

## Local verification (Claude Code)

- 2026-10-28: `pnpm test` 99 pass; `pnpm typecheck`, `pnpm lint` and `pnpm test:req` pass. `pnpm test:e2e` (mobile and desktop) 73 passed, none skipped: the NFR-SEO-02 `test.fixme` is now three real tests.
- Production build, read with curl:
  - `/en/map`: title "Playground map · …", its description, canonical `/en/map`, alternates `sl` → `/sl/map`, `en` → `/en/map`, `x-default` → `/sl/map`.
  - A playground (sl and en): its name as title, its description, its own canonical and alternates.
  - `/sl/login`: "Prijava · …", `noindex, follow`, no canonical.
  - The sitemap: 30 URLs, each with sl, en and x-default alternates.
- **The stale sitemap, reproduced and fixed without clearing the cache** (as in production):
  - before: the built sitemap listed playground ids that aren't in the database (one checked: 404);
  - after: rebuilt with the year-old cache entry still present, the sitemap's 10 playground ids equal the database's 10, with none stale and none missing. The build shows `/sitemap.xml` with revalidation `1h`.

## Production steps (Cursor)

1. Preflight. The working tree must be clean, and 0018 must be `done`.
2. No migrations. Commit and push, then watch the deploy until it is `READY`. Smoke-test the `smokePaths`, plus *Verify in production*.
3. **Owner, optional:** in Google Search Console, resubmit `<productionUrl>/sitemap.xml`. Under "Pages", the 404 entries that came from the old sitemap clear over the following weeks.

## Verify in production

Read-only checks after the deploy:

```bash
# A public page names itself canonical and links both languages.
curl -s <productionUrl>/en/map | grep -oE '<link rel="(canonical|alternate)"[^>]*>'

# A personal page: no canonical, kept out of search results.
curl -s <productionUrl>/sl/login | grep -oE '<link rel="canonical"[^>]*>|<meta name="robots"[^>]*>'

# The sitemap carries alternates, and none of its playgrounds is missing.
curl -s <productionUrl>/sitemap.xml | grep -c 'hreflang="en"'
for u in $(curl -s <productionUrl>/sitemap.xml | grep -oE '<loc>[^<]*/sl/playground/[^<]*</loc>' | sed 's/<[^>]*>//g' | head -20); do
  curl -s -o /dev/null -w "%{http_code} $u\n" "$u"
done | grep -v '^200' | head
```

Expect:
- The first prints 4 lines: canonical `…/en/map`, then alternates `sl` → `…/sl/map`, `en` → `…/en/map`, `x-default` → `…/sl/map`.
- The second prints only `<meta name="robots" content="noindex, follow"/>`, with no canonical.
- The third prints a number above 0, two per playground plus 10.
- The loop prints nothing: none of the first 20 playgrounds in the sitemap answers anything but 200. If it prints 404s, the deploy reused the old cached list. Record the lines, wait an hour (one revalidation) and check again, before setting `blocked`.

## Rollback

`git revert` the commit and push. There is no data or schema to undo. The sitemap would go back to being cached indefinitely.

## Result log (Cursor)

