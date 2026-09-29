# RADARSite Phase 3 Staged Media Proposal

**Date:** 2026-09-29  
**Status:** Proposal only — **not executed**  
**Provider identifier:** `legacy` (retained as instructed; no rename)  
**Production mutations:** None performed

## Gate conclusion

The current `content_media` table can represent a canonical hosted asset and one optional `content_id`, but it cannot faithfully represent all required placement semantics:

- one media asset used by multiple articles;
- one article’s featured-image role separately from inline use;
- multiple inline placements of the same media in one article; and
- placement ordering/locator data.

Because the staged batch intentionally includes a shared asset and a URL-only inline reference, **the staged run must stop before relationship persistence** until the relationship model decision is approved. No new schema has been implemented here.

The proposal below is therefore the complete execution plan and approval package, not an authorization to run it.

## A. Exact proposed staged batch

All records are from the read-only `remradar.wordpress.com` inventory. The exact machine-readable selection is in `proposed-batch.json`.

| Fixture | Provider identity | Source URL | Source usage | Expected relationship |
|---|---|---|---|---|
| 1. Featured JPEG | `legacy:4757` | `https://remradar.wordpress.com/wp-content/uploads/2025/12/img_8211.jpg` | Featured image for article `wp-4754` / post `4754` | Featured role on `artist-spotlight-wealth-asuquo-abujas-livewire-afrobeats-star-on-a-relentless-rise` |
| 2. Inline PNG | `legacy:4694` | `https://remradar.wordpress.com/wp-content/uploads/2025/12/img_6963.png` | Inline image for post `4708` | One inline placement in `capitol-film-fest-3-0-abujas-creative-capital-comes-alive-on-december-14-2025` |
| 3. Shared JPEG | `legacy:4420` | `https://remradar.wordpress.com/wp-content/uploads/2025/10/img_7922-teegha-daplug.jpg` | Inline image in posts `4509` and `4427` | Same media asset used by both articles; two inline relationships |
| 4. Attachment-ID JPEG | `legacy:4755` | `https://remradar.wordpress.com/wp-content/uploads/2025/12/f2335313-364e-4d15-a268-bfe6529d7f8a.jpeg` | Inline image in post `4754`, with `data-attachment-id="4755"` | One inline relationship in the Wealth Asuquo article |
| 5. URL-only JPEG | `legacy:urlsha256:8b4e…` | `https://remradar.wordpress.com/wp-content/uploads/2025/10/img_4760.jpg?w=1024` | Inline image in post `4262`, with no attachment ID in the observed tag | One provisional URL-based inline relationship in `mosa-temple-ignites-abuja-airwaves-with-strategic-radio-tour-ahead-of-new-release` |

The complete URL hash for fixture 5 must be computed by the migration manifest from the exact normalized source URL. It must not be manually shortened as an identity.

### Batch properties covered

- Featured image: fixture 1.
- Inline image: fixtures 2–5.
- Same image referenced by multiple articles: fixture 3.
- JPEG: fixtures 1, 3–5.
- PNG: fixture 2.
- Attachment-ID reference: fixtures 2–4.
- URL-only reference: fixture 5.

The batch is **five distinct source assets**, with the shared JPEG expected to be uploaded once and related to two articles after the relationship model is approved.

## B. Exact proposed R2 namespace/key structure

Do not reuse the existing `dry-run/` namespace.

### Attachment-ID assets

```text
site-assets/wordpress/legacy/attachments/<attachment-id>/original.<validated-extension>
site-assets/wordpress/legacy/attachments/<attachment-id>/webp/w-400.webp
site-assets/wordpress/legacy/attachments/<attachment-id>/webp/w-800.webp
site-assets/wordpress/legacy/attachments/<attachment-id>/webp/w-1200.webp
```

Examples:

```text
site-assets/wordpress/legacy/attachments/4757/original.jpg
site-assets/wordpress/legacy/attachments/4757/webp/w-800.webp
site-assets/wordpress/legacy/attachments/4694/original.png
site-assets/wordpress/legacy/attachments/4420/webp/w-1200.webp
```

### URL-only asset

Until WordPress attachment metadata resolves, use a distinct provisional namespace:

```text
site-assets/wordpress/legacy/url-refs/<sha256-normalized-source-url>/original.<validated-extension>
site-assets/wordpress/legacy/url-refs/<sha256-normalized-source-url>/webp/w-<width>.webp
```

This URL-derived identity must remain marked `identityKind: "url"` and must not be silently converted into an attachment identity later. If the source attachment ID is subsequently resolved, it becomes a conflict/review event rather than an automatic rename.

## C. Proposed conservative limits

These are proposed for approval, not hidden implementation defaults:

| Limit | Proposed value |
|---|---:|
| Maximum source file size | 10 MiB |
| Maximum dimensions | 8,000 × 8,000 pixels |
| Maximum decoded pixel count | 40 megapixels |
| Allowed source MIME types | `image/jpeg`, `image/png`, `image/webp` |
| GIF policy | Reject by default; no animated-image policy is approved |
| Request timeout | 20 seconds per source request |
| Concurrency | 1 source download/upload pipeline at a time |
| Rate limit | 1 source request per second |
| Retry count | 3 retries after the initial attempt |
| Retry/backoff | Only transient 408/425/429/5xx/network failures; exponential 2s/4s/8s with bounded jitter |
| Non-retryable failures | 401/403/404, TLS errors, MIME mismatch, size/dimension violation, decode failure, checksum conflict |

## D. Relationship behavior

### Existing schema result

The existing `content_media` row has one optional `content_id`, which is insufficient for the proposed batch because fixture 3 must relate one asset to two articles and because inline placement/order is not represented.

### Required relationship decision before execution

Propose a separate relationship table rather than overloading `content_media`:

```text
content_media_relationships
- id text primary key
- media_id text not null references content_media(id)
- content_key text not null
- content_source_provider text
- content_source_id text
- role text not null                 -- featured | inline
- placement_index integer             -- required for inline; null for featured
- source_locator text                 -- stable source occurrence/HTML locator
- provenance jsonb not null default '{}'
- created_at timestamptz not null
- updated_at timestamptz not null
```

Recommended constraints:

```text
UNIQUE (media_id, content_key, role, placement_index)
UNIQUE (content_key) WHERE role = 'featured'
```

The existing application stores editorial content as a JSON blob, so `content_key` must be a stable article identity such as the existing article `id`/source-qualified key, not an unvalidated array index. This schema is presented for review only and has not been created.

## E. `content_media` behavior

If the relationship model is approved, create **one** canonical `content_media` row per distinct fixture asset, not one row per article placement:

- five rows for the five proposed fixture assets;
- deterministic IDs `media:legacy:<attachment-id>` for fixtures 1–4;
- `media:legacy:url:<sha256>` for fixture 5;
- `provenance.migrationRunId` set to the run ID;
- `provenance.identityKind` set to `attachment` or `url`;
- source URL, source checksum, MIME, byte length, dimensions, original filename, and derivative checksums recorded;
- `content_id` left null until a reviewed relationship model is available, or used only for a single primary relationship if explicitly approved.

No persistent rows are created by this proposal.

## F. Conflict behavior

For an existing provider/attachment identity:

1. Compute the source SHA-256 before upload.
2. Look up the source-qualified media identity and manifest entry.
3. If checksum and compatible metadata match, mark `idempotent_reuse` and do not overwrite.
4. If checksum differs, mark `conflict`, preserve the existing object, record both checksums, and fail that item closed.
5. Never overwrite by key, filename, title, or URL alone.
6. A URL-only identity that later resolves to an attachment ID is a review conflict, not an automatic merge.

## G. Rollback procedure

Rollback is limited strictly to objects and records owned by the migration run:

1. Load the run manifest by exact run ID.
2. Select only rows with `createdByRunId` equal to that run ID.
3. Remove run-created relationship rows, if any, by exact relationship IDs.
4. Remove run-created `content_media` rows by exact media IDs.
5. Delete only the exact run-created R2 keys listed in the manifest.
6. Mark each manifest item `rolled_back` with cleanup timestamps and verification results.
7. Treat an already-absent run-owned object as cleaned; surface all other cleanup errors.
8. Never delete or modify original WordPress media, pre-existing R2 objects, unrelated content records, or objects selected by broad prefix.

## H. Verification procedure

For each staged asset, the machine-readable result must contain:

- run ID;
- provider (`legacy`);
- source identity;
- source URL;
- source checksum;
- derivative checksum(s);
- R2 key(s);
- `content_media` ID if created;
- relationship IDs if created;
- status and error code/message;
- start/end timestamps;
- source response MIME and byte length;
- dimensions;
- upload result;
- HEAD metadata result;
- bounded GET/checksum result;
- delivery URL validation;
- idempotency result;
- cleanup/rollback result.

The test must run the same exact fixture twice in a controlled run or paired run:

- first pass creates the run-owned objects/records;
- second pass proves identical checksums reuse the same identity without duplicate rows/objects;
- a deliberate changed-byte test must prove conflict handling without overwriting the original;
- rollback must leave no run-owned objects or records.

No editorial HTML or featured-image URL is changed during these checks.

## I. Known limitations

- The WordPress.com media endpoint returned HTTP 403; the complete unattached media population is unverified.
- `radarcharts.net` REST/media access failed TLS verification in the audit environment and was not bypassed.
- Full byte sizes, zero-byte detection, exact decoded MIME, and source reachability are not yet verified for the five fixtures.
- The current `content_media` schema lacks a many-to-many placement model and ordering/locator fields.
- Fixture 5 has no attachment ID in the observed image tag and therefore requires provisional URL identity.
- No schema migration or relationship table has been implemented.
- No production content/media changes have been made by this proposal.

## J. Exact production changes the staged run would make

**If and only if separately approved after the relationship-model decision:**

1. Upload up to five original objects under `site-assets/wordpress/legacy/...`.
2. Upload up to fifteen WebP derivative objects if all three widths are generated for all five fixtures.
3. Create up to five `content_media` rows, each tagged with the migration run ID.
4. Create relationship rows for the five fixture assets: one featured relationship, four inline relationships, plus a second inline relationship for the shared asset — **only after the relationship schema is approved**.
5. Write one machine-readable migration manifest/run record containing all source, checksum, object, persistence, relationship, and cleanup results.
6. No WordPress source media changes.
7. No `studio_content` body rewrite.
8. No featured-image URL rewrite.
9. No unrelated R2 object deletion.
10. No bulk crawl beyond the explicitly listed five fixtures.

### Current execution decision

**STOP.** The exact batch and contract are prepared, but the existing schema cannot represent all required relationships and the media endpoint remains 403. The next action requires review of this proposal, approval of the relationship model or an explicit decision to stage ingestion without relationship persistence, and authorization of the five-fixture run.
