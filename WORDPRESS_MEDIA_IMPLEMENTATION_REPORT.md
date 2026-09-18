# RADARSite Synthetic WordPress Media Implementation Report

**Date:** 2026-09-18  
**Phase:** Mother Base-approved synthetic implementation only  
**Production WordPress access:** None  
**Production media migration:** Not performed

## VERIFIED

The following checks passed:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run media:contract-test`
- `git diff --check`

The focused contract test completed with exit code 0 and reported zero remaining synthetic objects and zero remaining synthetic records.

## PROVIDER IDENTITY

### PROVIDER IDENTITY — VERIFIED

The repository defines `SourceProvider` as `"radarcharts" | "legacy"` in `src/lib/editorial-migration.ts`.

- `radarcharts` points to the current RADARCharts WordPress endpoint.
- `legacy` points to the public WordPress.com source for `remradar.wordpress.com`.

### EXISTING `legacy` USAGE — VERIFIED

`legacy` is used only in the current importer provider type/configuration, the legacy endpoint definition, the legacy query-shape branch, and the post-import source identity fields. Search found no committed production content records, media relationships, or database migration that use `legacy` outside those importer paths.

The word “legacy” also appears in editorial taxonomy/classification code as a content-section signal. That usage is semantic editorial text and is unrelated to the provider identifier.

### PROPOSED CANONICAL MAPPING

For this implementation, the existing identifier is preserved:

```text
radarcharts -> radarcharts.net
legacy      -> remradar.wordpress.com
```

The synthetic media pipeline accepts `legacy` because changing it to `remradar` would alter existing importer behavior and could change future editorial IDs such as `legacy-<sourceId>`. A future alias or migration to `remradar` requires a separate explicit review.

### MIGRATION IMPACT

No provider rename was performed. Existing importer behavior, content IDs, source-qualified editorial reconciliation, queries, and migration semantics were not changed.

## IMPLEMENTED

### New pipeline module

`src/lib/wordpress-media-dry-run.ts` implements the smallest synthetic media pipeline using injectable storage and repository adapters:

1. Validates a synthetic WordPress attachment fixture.
2. Computes provider-qualified media identity:

   ```text
   media:<provider>:<attachment_id>
   ```

3. Computes a SHA-256 source checksum.
4. Computes an isolated deterministic object key:

   ```text
   site-assets/wordpress-dry-run/<run-id>/<provider>/attachments/<attachment-id>/original.<ext>
   ```

5. Uploads through the storage adapter contract.
6. Verifies size, MIME type, and exact source bytes through head/get operations.
7. Creates a `ContentMediaRecord` carrying source provenance, dimensions, checksum, storage metadata, delivery URL, and dry-run provenance.
8. Reuses an existing record/object on an identical rerun.
9. Rejects changed source bytes for the same provider and attachment identity with `MEDIA_CHECKSUM_CONFLICT`.
10. Cleans up the uploaded object on forced failure.
11. Provides explicit cleanup for the temporary record and object.

### Synthetic test

`scripts/wordpress-media-contract-test.ts` uses the real pipeline module with in-memory storage and repository doubles. It does not bypass identity, key, checksum, metadata, idempotency, or cleanup logic. The doubles prevent any production R2 or database mutation while exercising the same pipeline contract.

### Package command

Added:

```text
npm run media:contract-test
```

No bulk migration command was added.

## TEST FIXTURE

The fixture represents:

- Provider: `legacy`
- Attachment ID: `123`
- Source URL: `https://remradar.wordpress.com/wp-content/uploads/2020/01/synthetic-image.png`
- Filename: `synthetic-image.png`
- MIME type: `image/png`
- Dimensions: `640 × 360`
- Source bytes: deterministic synthetic bytes
- Checksum: SHA-256 calculated from those bytes
- WordPress metadata: synthetic alt text and caption

The fixture is not downloaded from WordPress.

## TEST RESULTS

| Required behavior | Result |
|---|---|
| Provider-qualified attachment identity | **PASS** |
| Provider collision isolation | **PASS** — `legacy:123` and `radarcharts:123` produce different identities/keys |
| Deterministic R2 key generation | **PASS** |
| Source metadata propagation | **PASS** |
| Source checksum handling | **PASS** |
| Upload pipeline | **PASS** through isolated in-memory storage |
| Exact uploaded-byte verification | **PASS** |
| Metadata/head verification | **PASS** |
| HTTPS delivery URL generation | **PASS** |
| Temporary `content_media` representation | **PASS** through isolated repository double |
| Identical rerun | **PASS** — reused existing record/object |
| Checksum conflict | **PASS** — safely rejected |
| Failure after upload | **PASS** — object removed |
| Failure during persistence | **PASS** — object removed and no record retained |
| Final cleanup | **PASS** — zero objects and zero records remain |

## IDEMPOTENCY

The first run created one logical media identity and one isolated object. The second run with the same provider, attachment ID, run ID, and source bytes returned the existing record with `reused: true` and `uploaded: false`. Object count and record count remained one during the comparison.

A second fixture with the same provider and attachment ID but different source bytes was rejected with `MEDIA_CHECKSUM_CONFLICT`. The original object and record remained unchanged.

## CHECKSUM CONFLICT

Changed bytes do not silently overwrite the original media. The pipeline compares the calculated SHA-256 checksum before reuse and fails safely when the same provider-qualified identity receives different bytes.

## ROLLBACK

Forced failure after upload removed the synthetic R2 object and created no record. Forced failure during persistence also removed the synthetic object and left no record for that fixture. Cleanup errors are isolated from the original failure so the caller can report them separately in a future production runner.

## CLEANUP

The successful fixture was explicitly cleaned up after the idempotency and conflict checks. The final test result was:

```text
finalObjectCount: 0
finalRecordCount: 0
```

No persistent production `content_media` records were created.

## PRODUCTION SAFETY

The implementation and tests did **not**:

- Contact either WordPress provider.
- Download production WordPress media.
- Upload to the Production R2 bucket.
- Generate production WebP derivatives.
- Modify production `studio_content`.
- Create persistent production `content_media` records.
- Rewrite editorial HTML or image URLs.
- Modify production media relationships.
- Weaken TLS verification.
- Add or expose a bulk migration command.

The test’s storage and repository implementations are in-memory doubles. The existing Production R2 health test remains the separate evidence for real R2 connectivity.

## UNVERIFIED

- Live WordPress attachment metadata response handling.
- Live WordPress source-byte download.
- Real R2 upload of a WordPress image through the new pipeline.
- Real database `content_media` persistence for a WordPress attachment.
- Public delivery URL reachability for a WordPress media object.
- Current `radarcharts.net` media endpoint because the sandbox still reports TLS verification failure.

## REMAINING BLOCKERS

1. Mother Base must review the preserved `legacy` identifier and decide whether a future compatibility alias or explicit rename is needed.
2. A live single-attachment test requires an approved source attachment and a reviewed production/test storage namespace.
3. The real repository adapter needs a source-qualified media lookup/constraint before production idempotency can be guaranteed at database level.
4. The current RADARCharts TLS issue must be resolved or the source must be tested from an approved environment without disabling verification.
5. Production delivery URL configuration must be confirmed separately from the R2 API endpoint.

## NEXT STEP

Mother Base should review this synthetic implementation and test evidence. If approved, the smallest next step is one explicitly selected live attachment from a reachable provider, using a separately approved isolated R2 namespace and temporary database record. Stop again after that single-attachment test. Do not proceed to bulk migration or relationship rewriting without another review.

**STOP STATUS:** Synthetic implementation complete; live WordPress media and bulk migration remain blocked by explicit safety gates.
