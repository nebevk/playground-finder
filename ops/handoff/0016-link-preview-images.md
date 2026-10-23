---
id: 0016
title: Link previews show the brand, and each playground's own card
status: done
order: any
destructive: false
migrations: []
checksums: []
depends_on: [0015]
backlog: []
requirements: [NFR-SEO-03, GDPR-16]
---

## Why

The owner shared a link in Teams, and the preview showed an empty placeholder image: the site had no preview image (`og:image`) at all.

## Changes

- **Site card** (`src/app/[locale]/opengraph-image.tsx`): the swing mark on the brand purple, the app name in the kit's Bubblegum Sans and the slogan, in the page's language. Every page without a card of its own uses it. It is built once, at build time.
- **Playground card** (`src/app/[locale]/playground/[id]/opengraph-image.tsx`): the playground's name, its rating (a gold star, or "Še ni ocen"), up to six of its features and play equipment, and the swing mark. Its alt text is "<name> · <app name>".
  - Read from the public map snapshot, so it shows only what any visitor may see. It is cached with the map and rebuilt when the map changes (a review, an edit), and after an hour at the latest.
  - Never the playground's photos: link previews copy images onto other platforms' servers, out of reach of moderation and deletion (GDPR-16).
- **Shared drawing code** (`src/lib/og.tsx`): sizes, brand colours, fonts, the mark. Names and labels come from the message files, so the brand name stays swappable.
- **Assets** (`assets/og/`): Nunito (Bold, ExtraBold) and Bubblegum Sans as TrueType, both under the SIL Open Font License (licences beside them), and the kit's two static swing marks. They are bundled with the image routes (checked in the build's file traces).
- **`twitter:card` is `summary_large_image`**, so X, Slack and others show the wide card, not a small square.
- **Docs:** new requirement NFR-SEO-03.
- **Tests (e2e):** the site's `og:image` on `/sl` and `/en` (one tag, the right card, its alt text, a PNG answer); a playground page's `og:image` is its own card, with its name in the alt text, and a PNG answer.

## Local verification (Claude Code)

- 2026-10-23: `pnpm test` 90 pass; `pnpm typecheck`, `pnpm lint` and `pnpm test:req` pass. `pnpm test:e2e` 70 passed (1 known gap skipped).
- Cards rendered on a production build and checked by eye: the site card in both languages; playground cards with a rating, with no ratings and six chips, and with a name over two lines.

## Production steps (Cursor)

1. Preflight. The working tree must be clean, and 0015 must be `done`.
2. No migrations. Commit and push, then watch the deploy until it is `READY`. Smoke-test the `smokePaths`, plus *Verify in production*.
3. **Owner test** (record the result): paste `<productionUrl>/sl` and then a playground's link into a Teams or WhatsApp chat. The first shows the purple card with the name and slogan; the second shows that playground's card. Teams and others keep old previews for a while, so if the placeholder still shows, add `?v=1` to the link.

## Verify in production

No database changes. Read-only checks after the deploy:

```bash
curl -s <productionUrl>/sl | grep -o '<meta property="og:image" content="[^"]*"'
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" <productionUrl>/sl/opengraph-image/site
```

Expect:
- The first prints one tag, whose URL ends in `/sl/opengraph-image/site?…`.
- The second prints `200 image/png`.
- Then take a playground's link from the map and check its page the same way. Its `og:image` ends in `/sl/playground/<id>/opengraph-image/card?…`, and that URL answers `200 image/png`.

## Rollback

`git revert` the commit and push. There is no data or schema to undo.

## Result log (Cursor)

- **2026-10-23T14:50Z** started. Preflight OK (ledger clean, prod READY on `8697c10`, `more_playground_options` not in prod). Pushing `3b2b132` only (0017 commits stay local until migration).
- **2026-10-23T14:53Z** deploy `dpl_FSTy2yFntknQfgc8PcgnbFbiTrYT` READY on `3b2b132`. Smoke paths all 200. Site `og:image` → `/sl/opengraph-image/site?…` (200 image/png). Playground `55d281fd-…` card → `/sl/playground/…/opengraph-image/card?…` (200 image/png). Owner: paste `/sl` and a playground link into Teams/WhatsApp (add `?v=1` if cache shows the old placeholder). **status → done**.

