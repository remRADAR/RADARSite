# Notion image permanence — the permanent fix

**Status:** implemented, tested, awaiting deploy
**Date:** 2026-11-27

## The problem

Notion serves every uploaded image from a short-lived signed URL:

```
https://prod-files-secure.s3.us-west-2.amazonaws.com/<workspace>/<block>/<file>.webp
  ?X-Amz-Algorithm=...&X-Amz-Expires=3600&X-Amz-Signature=...
```

The signature expires within about an hour, and the object is never mirrored
into our Cloudflare R2 bucket. Any article whose stored `bodyHtml` kept one of
those URLs renders broken images as soon as the signature lapses.

Two live articles were affected:

- `david-acekeyz-the-journey-17-track-debut-album`
- `eze-a-new-name-a-deeper-connection-and-a-return-to-music`

Both were confirmed broken in production on 2026-11-27: the stored signed URLs
now return **HTTP 403**.

## Why the existing pipeline did not catch it

`renderNotionBlockTree` already imports the images it *renders*. But nothing
guarded the **stored HTML**. Any article that reached the CMS through a path
that did not re-render the block tree — a Studio save, a legacy record, or a
re-publish whose fingerprint treated the image as unchanged — kept the
temporary URL permanently.

## The fix — four layers

### 1. Detection (`src/lib/notion-image-hygiene.ts`)

A single, dependency-free source of truth for recognising a temporary Notion
image URL. It covers the current `prod-files-secure.s3.*.amazonaws.com` host,
the legacy `notion-static.com` hosts, and the `/secure.notion-static.com/` path
form. A generic S3 host is only treated as Notion when its path matches a
Notion file layout, so a legitimate object on another bucket is never flagged.

It also provides `rewriteTemporaryNotionImages`, which replaces every temporary
URL in an HTML body and **reports** anything it could not resolve rather than
silently dropping it.

### 2. Repair engine (`src/lib/notion-image-repair.ts`)

The key insight: **only the query string expires.** `origin + pathname` is the
stable identity of a Notion file and survives every re-signing. That is what
makes it possible to repair an article whose stored URL has *already* expired —
re-read the Notion page, take the freshly signed URL for the same path,
download it, store it in R2, and rewrite the stored HTML.

Matching order:

1. exact stable-identity match (the same file, re-signed) — preferred;
2. positional match among inline images (the file was replaced) — fallback;
3. nothing — the record is reported as unrepairable and left untouched.

### 3. Hard gates — a temporary link can never be published again

- **Notion publish route** (`src/app/api/integrations/notion/publish/route.ts`):
  `toPublishedRecord` now refuses to return a record that still contains a
  temporary Notion URL (`502 temporary_notion_image_url`). Dry-run and
  comparison records opt out, since they never reach the CMS.
- **Studio write path** (`src/app/api/studio/route.ts`): a `published` article
  carrying a temporary URL is rejected with `422 temporary_notion_image_url`.
  Drafts are still allowed through so editors can keep working.

### 4. Backfill endpoint (`src/app/api/internal/notion-image-repair/route.ts`)

`POST /api/internal/notion-image-repair` repairs every live record that still
carries a temporary URL. It is idempotent and safe to re-run:

- only touches records that actually contain a temporary URL;
- re-reads the Notion page for a fresh signed URL per file;
- imports each image into R2 and rewrites the stored HTML;
- writes with the same compare-and-swap guard the publish path uses;
- never writes a partially repaired record.

`GET` on the same route is a read-only inventory of affected records.
`{"dryRun": true}` reports what would change without writing.

Auth: `Authorization: Bearer $RADAR_NOTION_SYNC_SECRET`.
Requires `RADAR_NOTION_PUBLISHING_ENABLED=true`, `NOTION_API_KEY`, and a
complete R2 configuration (`R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL`).

## Tests

`npm run notion:image-hygiene-contract-test` — 30+ assertions covering
detection (current, legacy, false positives), discovery, rewriting, the
"never accept a temporary URL as a replacement" rule, stable identity across
re-signing, path matching, positional fallback, full record repair, and the
publish gate.

`npm run notion:contract-test` — the existing 25-check publish contract still
passes unchanged.

## Operating it

```bash
# What is still broken?
curl -H "Authorization: Bearer $RADAR_NOTION_SYNC_SECRET" \
  https://radarcharts.net/api/internal/notion-image-repair

# What would a repair do?
curl -X POST -H "Authorization: Bearer $RADAR_NOTION_SYNC_SECRET" \
  -H "content-type: application/json" -d '{"dryRun":true}' \
  https://radarcharts.net/api/internal/notion-image-repair

# Repair everything
curl -X POST -H "Authorization: Bearer $RADAR_NOTION_SYNC_SECRET" \
  -H "content-type: application/json" -d '{}' \
  https://radarcharts.net/api/internal/notion-image-repair
```

## What this does NOT do

- It does not re-upload images that Notion has already deleted. If a Notion
  block was removed, the file is gone and the record is reported as
  unrepairable rather than guessed at.
- It does not change the Notion page itself. The source of truth stays Notion;
  only the stored CMS copy is rewritten.
