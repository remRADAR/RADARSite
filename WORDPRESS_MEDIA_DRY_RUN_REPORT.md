# RADARSite WordPress Media Dry-Run Report

**Date:** 2026-09-18  
**Scope:** Controlled inspection only; no WordPress media download, R2 media upload, WebP production generation, or bulk `content_media` write was performed.

## VERIFIED

The Production R2 health test has already verified the storage lifecycle with a temporary text fixture: upload, read/existence path, metadata, delivery URL generation, deletion, temporary `content_media` creation and cleanup, and orphan checking.

The local WebP conversion smoke test has also verified that `sharp` can create WebP derivatives from a local SVG fixture at 1200, 960, and 480 pixel widths.

The current repository contains a WordPress editorial importer, but it does not contain a WordPress media migration implementation that downloads source media, derives deterministic R2 keys, uploads media, records media provenance, rewrites CMS relationships, or performs media-specific rollback.

## AGENT CLAIM

No claim is made that a WordPress media dry run succeeded. The requested dry run was not executed because the existing implementation cannot isolate the requested media fixture safely without first adding a new migration path and defining its key, relationship, idempotency, and rollback semantics.

## EXISTING PATH AUDIT

### 1. Source media selection

`src/lib/editorial-migration.ts` reads WordPress posts from either the current RADARCharts endpoint or the explicit legacy WordPress.com endpoint. For each post, it selects media only as URL strings:

- `featured_image`;
- legacy `post_thumbnail.URL`;
- the first supported inline image URL when featured metadata is unavailable;
- inline `src`, `srcset`, `data-src`, `data-lazy-src`, `data-original`, `data-orig-file`, and `data-large-file` attributes.

The importer does not call the WordPress media endpoint, does not select a bounded media ID fixture, and does not download source bytes.

### 2. WordPress metadata

The importer reads post-level fields such as ID, slug, title, content, excerpt, date, modified date, URL, featured-image URL, thumbnail URL, author, categories, and tags. It does not read WordPress media records, attachment IDs, MIME types, filenames, dimensions, checksums, or media modification timestamps.

### 3. R2 object-key determination

There is no WordPress media key function. The only existing production object-key behavior is the temporary health route, which generates a random key:

```text
site-assets/health-check/<random-uuid>.txt
```

The WebP smoke test uses the fixed local-only prefix `site-assets/smoke`; it does not upload to R2. Therefore no deterministic source-media key or collision policy currently exists for WordPress media.

### 4. `content_media` creation and linking

`content-server.ts` defines `content_media` persistence and an `upsertMediaRecord` helper with a primary key on `id` and a unique constraint on `storage_key`. The only caller is `/api/studio/media-health`, which creates a temporary health record with `sourceProvider: "health-check"`, then deletes it.

The WordPress importer writes editorial records to `studio_content`; it does not call `upsertMediaRecord`, does not link media to an editorial `contentId`, and does not rewrite `featuredImage`, `imageUrl`, or rich-body image URLs to hosted delivery URLs.

### 5. Delivery URLs

`media-storage.ts` uses `R2_PUBLIC_BASE_URL` when configured. Otherwise it constructs a fallback URL from the R2 API endpoint, bucket, and object key. This behavior is implemented for generic storage operations but is not connected to WordPress media migration because no such migration operation exists.

### 6. Idempotency

The editorial importer is source-qualified and can reconcile post records by provider and source ID. That idempotency does not extend to media. The health route deliberately uses random UUIDs, so repeated health tests create distinct temporary fixtures and then clean them up. There is no deterministic media identity or source attachment ID mapping to test for duplicate prevention.

### 7. Rollback and cleanup

The health route has best-effort cleanup for its temporary object and temporary `content_media` record. The WordPress importer has no media cleanup transaction, no media rollback manifest, no source-to-object mapping manifest, and no safe recovery path for partially uploaded media. A production media dry run cannot therefore verify the requested rollback semantics.

## TEST FIXTURE

No WordPress fixture was selected or contacted. This was intentional: selecting a live WordPress attachment without an implemented source-byte download and deterministic cleanup contract would risk creating an orphaned R2 object or an unverifiable CMS relationship.

The existing local fixtures were not reused as a WordPress media dry run because:

- the SVG fixture is local and not WordPress-originated;
- the WebP smoke test does not upload to R2;
- the health fixture is text-only and intentionally unrelated to CMS content;
- the health route uses random keys and does not exercise source-media provenance.

## CHANGES MADE

No application code or production data was changed for this dry-run request. This report is the only artifact created.

## CHANGES NOT MADE

No WordPress media was downloaded or modified. No R2 media object was uploaded. No WebP derivative was generated from WordPress media. No `studio_content` record was modified. No production `content_media` row was created or changed. No editorial image URL or body HTML was rewritten.

## RESULTS

| Requested verification | Result |
|---|---|
| Read source WordPress media | **NOT RUN** — no media endpoint/fixture path exists |
| Determine intended deterministic R2 key | **NOT AVAILABLE** |
| Upload source media | **NOT RUN** |
| Compare uploaded bytes with source | **NOT RUN** |
| Verify media metadata | **NOT RUN** |
| Validate generated delivery URL | **NOT RUN** for WordPress media |
| Verify CMS/database relationship | **NOT RUN** |
| Verify rerun idempotency | **NOT TESTABLE** |
| Verify cleanup/rollback | **NOT TESTABLE** beyond the unrelated health fixture |
| Modify unrelated production media | **NO** |

## IDEMPOTENCY RESULT

**Not verified for WordPress media.** The existing `content_media.storage_key` uniqueness and `upsertMediaRecord` behavior are useful primitives, but no source attachment identity or deterministic key mapping is currently implemented. The existing health fixture is intentionally random and cannot prove media migration idempotency.

## CLEANUP RESULT

No media dry-run object or record was created, so there was nothing to clean up. The previously verified health fixture cleaned up successfully, but that result does not establish WordPress media rollback behavior.

## REMAINING RISKS

1. **No media source-byte acquisition:** the importer has URLs but no bounded attachment fetcher, MIME validation, byte-size limit, timeout policy, or source checksum.
2. **No deterministic key contract:** duplicate prevention and rerun behavior cannot be proven.
3. **No relationship contract:** featured images, inline images, and editorial records are not linked through `content_media`.
4. **No partial-failure manifest:** a multi-step media run could leave uploaded objects without durable migration state unless a manifest and rollback protocol are added.
5. **Current-source TLS limitation:** the prior diagnostics report still classifies the current RADARCharts WordPress endpoint as blocked or unverified from the sandbox due to certificate verification failure. The legacy provider is available but must not be promoted to primary without separate review.

## NEXT RECOMMENDATION

Add a narrowly scoped, dry-run-only media migration module before attempting any WordPress media operation. It should accept an explicit provider and bounded attachment fixture, fetch and validate one source object, derive a deterministic key from provider plus source attachment ID and checksum, upload only under a dry-run namespace, verify byte count/checksum/metadata, upsert a temporary `content_media` record, verify a second run is an upsert/no-duplicate operation, and delete both fixture object and record in a `finally` cleanup block. The module should produce a manifest without modifying editorial image relationships. After that implementation is reviewed by Mother Base, run the single-fixture dry run and stop again before any bulk migration.

**STOP STATUS:** Safe stop. No destructive or production media operation was attempted.
