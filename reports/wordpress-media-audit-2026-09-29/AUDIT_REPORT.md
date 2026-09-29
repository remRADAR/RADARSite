# RADARSite WordPress Media Read-Only Audit

**Audit date:** 2026-09-29  
**Scope:** Phase 1 read-only production/source audit and Phase 2 migration-contract proposal  
**Safety status:** No WordPress, R2, Neon, `studio_content`, `content_media`, editorial HTML, or media relationship mutations were performed.

## Executive result

The previous single-image Production dry run proved the R2/Sharp plumbing for one current-source image. This audit does **not** treat that as evidence that a bulk migration is safe.

The reachable legacy WordPress.com post API reports **279 posts**. A bounded read-only fetch of all three pages found **278 featured-image references**, **629 inline image references**, **898 unique source image URLs**, and **554 unique inline attachment IDs**. The dedicated legacy media-library endpoint returned **HTTP 403**, so the authoritative total attachment count, exact byte sizes, zero-byte detection, full MIME validation, and complete reachability check remain unavailable.

The committed RADARSite snapshot contains **342 published articles**: **279 `legacy` records and 63 `radarcharts` records**. It contains **342 featured-image references**, **1,195 inline image references**, **1,500 unique media URLs**, and **1,510 total media references**. All 342 snapshot articles have at least one media reference. The snapshot contains **no duplicate provider/source identities**, but it does contain reused media URLs across articles; those are candidates for shared deterministic media identity rather than duplicate uploads.

The current `radarcharts.net` posts and media REST endpoints could not be safely queried from this environment because TLS certificate verification failed. TLS verification was not disabled. The legacy media endpoint's 403 was preserved as an access limitation rather than bypassed.

## Phase 1 findings

| Audit item | Result | Confidence / limitation |
|---|---:|---|
| Live legacy post count | 279 | Verified from three read-only API pages; API response reported `found: 279`. |
| Live legacy media-library count | Not available | `GET /media/?number=1&page=1` returned HTTP 403. |
| Current RADARCharts post count | Not available | TLS certificate verification failed; no insecure retry was used. |
| Current RADARCharts media count | Not available | Same TLS limitation. |
| Snapshot articles | 342 | Verified from committed `src/data/merged-content.json`. |
| Snapshot published articles | 342 | Verified from committed snapshot. |
| Snapshot providers | 279 legacy / 63 radarcharts | Verified from snapshot. |
| Snapshot featured-image references | 342 | 340 unique URLs; two URLs are reused. |
| Snapshot inline-image references | 1,195 | 1,166 unique URLs. |
| Snapshot total media references | 1,510 | 1,500 unique URLs. |
| Snapshot articles without media | 0 | Verified from snapshot parsing. |
| Legacy featured-image references | 278 | 276 unique URLs. One of 279 posts had no featured image metadata. |
| Legacy inline-image references | 629 | 622 unique URLs. |
| Legacy unique media URLs | 898 | Derived from post metadata/body HTML, not media-library enumeration. |
| Legacy inline attachment IDs | 565 references / 554 unique IDs | Derived from `data-attachment-id` in read-only post HTML. |
| Legacy posts without any media | 0 | After parsing featured and inline media references. |
| Legacy MIME hints | 266 JPEG / 12 PNG | Hints from `post_thumbnail`; not a complete media-library MIME audit. |
| Legacy dimension hints | Present for 278 featured thumbnails | Dimensions came from post metadata; not a complete attachment dimension audit. |
| Legacy filename/extension hints | `.jpg` 357, `.jpeg` 212, `.png` 53, `.gif` 6, `.webp` 1 | Derived from referenced URLs; not proof of decoded content type. |
| Legacy duplicate source URL references | 9 repeated references | Reuse is not automatically an error; requires source-qualified identity handling. |
| Zero-byte files | Not verified | Full media endpoint is blocked and no bulk byte download was authorized. |
| Full source reachability | Not verified | No bulk media download was performed. |

## Source and usage evidence

The machine-readable files in this directory preserve the endpoint responses/statuses and the derived counts:

- `media-audit.json` — endpoint health and committed snapshot analysis.
- `snapshot-usage.json` — article-level media usage rows and duplicate URL candidates.
- `legacy-source-usage.json` — all 279 legacy post usage counts.
- `legacy-media-metadata-hints.json` — dimensions, MIME, and extension hints with limitations.

The existing source model uses `radarcharts` for the current endpoint and `legacy` for `remradar.wordpress.com`. The architecture contract previously identified this as a vocabulary conflict: future migration design should decide whether the legacy provider is renamed to canonical `remradar` or retained as a compatibility alias. No rename was made in this audit.

## Phase 2 proposed migration contract

### 1. Identity and deterministic keying

Use the provider-qualified attachment identity:

```text
media:<canonical-provider>:<wordpress-attachment-id>
```

Use a separate deterministic object namespace for each representation:

```text
site-assets/wordpress/<provider>/attachments/<attachment-id>/original.<validated-ext>
site-assets/wordpress/<provider>/attachments/<attachment-id>/webp/w-<width>.webp
```

Do not key by title, slug, mutable filename, or checksum alone. The final canonical provider vocabulary remains an approval item because the repository currently stores the legacy source as `legacy` while the architecture contract proposes `remradar`.

### 2. Exact bytes, checksums, and metadata

Every source download must record source URL, provider, attachment ID, response MIME, byte length, SHA-256, source dimensions, filename, WordPress metadata, and retrieval timestamp. The uploaded original and every derivative must be verified using HEAD metadata plus a bounded GET checksum before the item is marked successful.

The byte limit, timeout, accepted MIME list, and maximum pixel dimensions must be explicit configuration rather than silently inferred. Decode failures, MIME mismatches, zero-byte responses, suspicious extensions, and dimension overflows must fail closed.

### 3. Existing-object conflict policy

For the same provider-plus-attachment identity:

- matching source checksum and compatible metadata: reuse the existing asset and record an idempotent success;
- different checksum: do not overwrite silently; record a conflict and stop that item;
- same key with incompatible metadata: fail closed and require review;
- an object found without a matching manifest/identity: treat as an orphan candidate, never delete automatically.

### 4. Batching and rate limiting

The first controlled batch should be explicitly enumerated by attachment ID and article relationship, not selected by an open-ended crawl. Use a small concurrency limit, bounded request rate, per-request timeout, and source-respecting backoff. The batch size and rate require approval before execution because the media-library endpoint is currently 403 and the current source endpoint is not reachable from this environment.

### 5. Retry and failure handling

Retry only transient transport failures with a finite attempt count and exponential backoff. Do not retry checksum, MIME, authorization, 4xx, decode, or relationship errors as if they were transient. Preserve the first underlying failure and the final retry classification in the manifest.

### 6. Resumability and manifest

Create a machine-readable run manifest before any staged mutation. Each attachment row should include run ID, provider, source attachment ID, source URL, article IDs/roles, planned keys, status, attempts, timestamps, source checksum, derivative checksums, R2 verification results, content-media result, relationship result, cleanup result, and error details. Resume only from explicit `pending`/`retryable` rows; never infer progress from object existence alone.

### 7. Database and `content_media` relationships

Do not create persistent `content_media` records during this Phase 1 audit. For a future approved staged run, use a deterministic source-qualified media ID and a reviewed uniqueness constraint/helper for `(source_provider, source_id)`. The current schema has a unique storage key and ID upsert, but it does not yet enforce source-qualified uniqueness or provide a source lookup helper. That schema gap must be resolved or explicitly accepted before a persistent staged run.

Do not use the current single `content_id` field as a substitute for a many-to-many placement model. Featured and inline placements should first be represented in the manifest/provenance mapping. A separate relationship model may be required for media reused by multiple articles.

### 8. Editorial HTML and featured-image rewriting

No HTML or featured-image URL rewrite is proposed for the staged upload-only proof. If rewriting is later authorized, it must be a separate reviewed phase after hosted delivery has been verified. Rewrite from a source-qualified manifest mapping, preserve the original URL/provenance, validate the resulting HTML, and verify the affected article render before committing the rewrite.

Featured-image relationships and inline placements must be tracked separately. The audit found reused media URLs and therefore a single hosted asset may legitimately serve multiple articles.

### 9. Rollback and partial completion

A staged run must be reversible by manifest row. For an item with an uploaded object but no committed relationship, delete only the run-owned object. For an item with a temporary database row, delete that exact run-qualified row first or in the documented reverse order. For a committed production asset, rollback must mean restoring the prior relationship/record state, not deleting an object by broad prefix.

Cleanup must be idempotent: already-absent run-owned objects are considered cleaned, while cleanup errors remain visible and fail the run's final readiness result.

### 10. Observability and reconciliation

Emit structured per-item events for source fetch, validation, conversion, upload, HEAD, GET/checksum, persistence, relationship mapping, cleanup, and final status. The final report must reconcile manifest rows against R2 objects and database records without deleting unrecognized objects automatically.

## Decisions requiring explicit authorization

Before Phase 3, the following choices must be approved rather than inferred:

1. Canonical provider vocabulary: retain `legacy` or rename/alias it to `remradar`.
2. Whether the first staged test may create persistent `content_media` records.
3. The approved production object namespace and whether originals, derivatives, or both are retained.
4. The accepted MIME types, size/pixel limits, and rate/concurrency limits.
5. The conflict policy for changed bytes under an existing provider-plus-attachment identity.
6. Whether a separate media-placement relationship model is required.
7. Whether any editorial HTML or featured-image URLs may be rewritten during the staged test.
8. The exact staged batch: article IDs, attachment IDs, and edge cases included.
9. The rollback authority and whether any existing hosted objects may be removed if they are proven run-owned.
10. Whether the legacy media endpoint's HTTP 403 can be resolved through authorized credentials or an approved alternate read-only source.

## Gate status

**Phase 1:** Completed as far as safely possible with available read-only access.  
**Phase 2:** Proposed contract documented; approval decisions listed.  
**Phase 3:** Not started. No staged migration or persistent production derivative was executed.  
**Phase 4:** Not applicable until an authorized staged test is completed.

The recommended next step is to review the endpoint-access limitations and the ten decisions above. No bulk migration should proceed from this audit alone.
