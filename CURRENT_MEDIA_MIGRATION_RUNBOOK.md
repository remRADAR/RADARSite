# Current Media Migration Runbook

The protected route `/api/studio/current-media-migrate` migrates the 139 verified current WordPress assets referenced by the 63 current articles.

## Required production configuration

The route requires the existing Studio session authentication, `DATABASE_URL`, and the R2 variables already used by the application:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET=radarsite-media`
- `R2_PUBLIC_BASE_URL`

If the WordPress source requires authenticated media delivery, configure the server-only variable `WORDPRESS_MEDIA_AUTHORIZATION`. It must contain the complete authorization value, for example `Bearer <server-side-token>`. Never expose this variable to the browser or commit it.

## Phases

### 1. Dry run

Dry run fetches each source asset, verifies the expected byte count and SHA-256 from the committed verification manifest, generates WebP derivatives, and performs no R2 or database writes.

```json
{
  "mode": "dry-run",
  "offset": 0,
  "limit": 10,
  "runId": "current-media-20261006-a"
}
```

The maximum batch size is 10 assets. Continue using the returned `nextOffset` until it is `null`.

### 2. Upload and relationship phase

This phase uploads deterministic derivatives under:

```text
current-media/attachment-{attachmentId}/w-{width}.webp
```

It verifies each uploaded object by reading it back and comparing byte length and SHA-256. It then upserts `content_media` records and deterministic featured/inline relationships. It does not rewrite article content.

```json
{
  "mode": "upload",
  "offset": 0,
  "limit": 10,
  "runId": "current-media-20261006-a",
  "confirmation": "current-media-r2-apply-v1"
}
```

The upload phase is idempotent. Repeating the same batch uses the same object keys and record identities.

### 3. CMS rewrite phase

After every upload batch has been verified, run the matching batch in rewrite mode. The route checks that the R2 objects already exist, upserts the records and relationships, rewrites featured-image paths and WordPress inline image variants to the appropriate WebP derivative, writes `studio_content`, and invalidates the public content cache.

```json
{
  "mode": "rewrite",
  "offset": 0,
  "limit": 10,
  "runId": "current-media-20261006-a",
  "confirmation": "current-media-r2-apply-v1"
}
```

The rewrite is limited to current records whose `sourceProvider` is `radarcharts` and whose `sourceId` matches the audited WordPress article ID. It does not modify legacy articles.

## Verification and rollback

The route is fail-closed when the audit manifest, source checksum, database, R2 configuration, or R2 object verification is missing. It does not delete WordPress or InfinityFree files. Keep the old source online until the full crawl confirms all 63 articles and their featured/inline images.

If a rewrite needs to be rolled back, restore the affected `studio_content` record from the pre-migration database backup or snapshot, then invalidate the public content cache. R2 objects are retained because the migration is non-destructive; no cleanup endpoint is provided by design.

The source audit and byte manifest are committed inputs:

- `current-article-media-audit.json`
- `current-article-media-byte-verification.json`
