# RADARSite WordPress Media Architecture Contract

**Phase:** Mother Base architecture/design review  
**Date:** 2026-09-18  
**Scope:** Evidence-backed design only. No migration code, production media, editorial relationships, WebP library, or persistent `content_media` records were changed.

## Reporting labels

- **VERIFIED** — directly established from repository or tool evidence.
- **AGENT CLAIM** — observed in this review but not independently confirmed by a separate production probe.
- **PROPOSED** — architecture recommendation for Mother Base review.
- **ASSUMED** — requires confirmation.
- **UNVERIFIED** — not currently testable.
- **CONFLICT** — contradicts existing evidence.

## VERIFIED EXISTING ARCHITECTURE

| Area | Evidence | Current behavior |
|---|---|---|
| Editorial storage | `src/lib/content-server.ts` | `studio_content` stores normalized JSON collections. `CmsRecord` already carries `sourceId`, `sourceUrl`, `sourceProvider`, image URLs, editorial fields, and migration warnings. |
| Media storage | `src/lib/content-server.ts` | `content_media` is created lazily with fields for source/provider, source URL/ID, filename, MIME, size, dimensions, R2 provider/bucket/key, delivery URL, checksum, migration status, provenance, and timestamps. `storage_key` is unique and `id` is the primary key. |
| Media persistence | `src/lib/content-server.ts` | `upsertMediaRecord` uses `INSERT ... ON CONFLICT (id) DO UPDATE`; `deleteMediaRecord` deletes by ID; `countMediaRecords` counts rows. No media lookup by provider plus source ID exists. |
| R2 adapter | `src/lib/media-storage.ts` | Uses AWS SDK S3 commands with `region: "auto"`, a derived or explicit HTTPS R2 endpoint, bucket supplied separately, and optional `R2_PUBLIC_BASE_URL`. Supports put, head, get, delete, health checks, and sanitized configuration diagnostics. |
| WebP processing | `src/lib/media-storage.ts` | `createWebpDerivatives` lazy-loads `sharp`, reads source metadata, and generates width-based WebP buffers. It does not upload or persist them. |
| WordPress importer | `src/lib/editorial-migration.ts` | Imports posts from two provider endpoints, normalizes titles/excerpts/body HTML, discovers image URLs, and writes editorial records only when not in dry-run mode. |
| Import identity | `src/lib/editorial-migration.ts` | Editorial records use provider plus source ID/source URL/slug as reconciliation keys. IDs are generated as `${source.provider}-${sourceId}`. |
| Media health fixture | `src/app/api/studio/media-health/route.ts` | Authenticated route creates a random text object and temporary `content_media` row, checks metadata, deletes object and row, verifies orphan-free cleanup, and returns sanitized results. It is not a WordPress media fixture. |
| Migration API | `src/app/api/studio/migrate/route.ts` | Authenticated dry-run-by-default post import endpoint. No media migration operation is exposed. |
| Tests/scripts | `tests/`, `scripts/` | Existing tests cover UI behavior. Available migration scripts cover source diagnostics, editorial reconciliation, and local WebP conversion; no media migration fixture or idempotency test exists. |
| Documentation | `CMS_MIGRATION_REPORT.md`, `CMS_RECOVERY_REPORT.md`, `WORDPRESS_MEDIA_DRY_RUN_REPORT.md` | Documents post import, source diagnostics, R2 health status, and the prior safe stop. |

## SOURCE MODEL

### VERIFIED

`src/lib/editorial-migration.ts` currently defines:

```text
SourceProvider = "radarcharts" | "legacy"
```

The current provider is represented by `radarcharts` and points to `RADARCHARTS_WORDPRESS_API` or `https://radarcharts.net/wp-json/wp/v2/posts`. The fallback provider is represented by `legacy` and points to the public WordPress.com API for `remradar.wordpress.com`.

### CONFLICT

Mother Base requires the canonical vocabulary:

```text
radarcharts = legacy/main source
remradar    = legendary source
```

The repository currently uses `legacy` for the `remradar.wordpress.com` provider. This is semantically ambiguous and conflicts with the requested canonical source vocabulary. No importer behavior is changed in this architecture phase.

### PROPOSED

Adopt one canonical vocabulary across future media and editorial contracts:

| Canonical provider | Domain | Role |
|---|---|---|
| `radarcharts` | `radarcharts.net` | Main/legacy source |
| `remradar` | `remradar.wordpress.com` | Legendary source |

A compatibility migration from the existing `legacy` identifier to `remradar` requires a separate reviewed implementation decision because changing existing importer behavior is explicitly out of scope for this phase.

## PROPOSED MEDIA CONTRACT

### A. Source identity

**PROPOSED:** The canonical WordPress attachment identity is:

```text
<provider>:<attachment_id>
```

Examples:

```text
radarcharts:123
remradar:123
```

This prevents collisions between providers and does not use mutable titles, slugs, or checksums as the primary identity.

**VERIFIED:** The existing `content_media` schema has `source_provider` and `source_id`, but no uniqueness constraint or lookup helper enforces this identity today.

**PROPOSED:** Add a reviewed uniqueness contract for `(source_provider, source_id)` or an equivalent deterministic media ID. Do not use a checksum as the primary identity.

### B. Source provenance

**PROPOSED:** Preserve the following in the existing `content_media` columns where they already fit:

| Provenance | Proposed owner |
|---|---|
| Provider | `source_provider` |
| WordPress attachment ID | `source_id` |
| Source media URL | `source_url` |
| Original filename | `original_filename` |
| MIME type | `mime_type` |
| File size | `file_size` |
| Width/height | `width`, `height` |
| Source checksum | `checksum` when checksum semantics are defined |
| WordPress metadata, sizes, alt text, caption, modified timestamp | `provenance` JSONB |

Do not duplicate fields already represented by dedicated columns. The source domain can be represented by the canonical provider and the original source URL; adding a separate domain column is not necessary unless later queries require it.

### C. Media identity and R2 object key

**PROPOSED media identity:**

```text
media:<provider>:<attachment_id>
```

**PROPOSED physical object key:**

```text
site-assets/wordpress/<provider>/attachments/<attachment_id>/original.<ext>
site-assets/wordpress/<provider>/attachments/<attachment_id>/webp/w-<width>.webp
```

The provider and attachment ID are the identity components. The extension is derived from validated source MIME metadata, not from a mutable title. WebP objects are separate physical representations of the same source attachment and must retain the source identity in their `provenance`.

**ASSUMED:** The `site-assets/wordpress/` prefix is compatible with existing deployment conventions. The repository currently has only health and local smoke prefixes, so the final prefix requires review.

### D. Meaning of `content_media`

**VERIFIED:** The current model combines physical media metadata and an optional `content_id` relationship in one row. It has no separate join table for many-to-many editorial relationships.

**PROPOSED:** Treat one `content_media` row as the canonical migrated media asset/representation, with `content_id` used only for a simple primary relationship where appropriate. Preserve richer WordPress placement data, attachment metadata, and relationship details in `provenance` until a separate relationship model is justified.

Do not create one duplicate row per editorial placement. Use the deterministic media identity and existing storage-key uniqueness to represent the physical asset once.

### E. Editorial relationship

**PROPOSED:** Future imported editorial records should retain the source-qualified media identity in a structured field or provenance mapping, then resolve to the hosted `delivery_url` only in the controlled relationship/rewrite stage. Featured media and inline media should be represented separately in a migration manifest before any HTML or editorial URL rewrite is attempted.

The architecture phase must not rewrite body HTML, featured-image URLs, or production editorial relationships.

## IDEMPOTENCY CONTRACT

**PROPOSED:** A rerun for the same provider and attachment ID must:

1. Compute the same media identity and original-object key.
2. Check existing `content_media` by source-qualified identity.
3. Compare source checksum and relevant metadata.
4. Reuse the existing object/row when checksum and metadata match.
5. Perform an explicit versioned replacement or mark a conflict when bytes differ.

If the same provider and attachment ID later produces different bytes, the system must not silently overwrite the existing object. The default recommendation is `migration_status: "failed"` or a review state with a conflict record in `provenance`; replacement should require an explicit reviewed policy.

**VERIFIED:** The current schema has unique `storage_key` and ID upsert behavior, but it does not yet provide source-qualified media lookup or changed-byte conflict handling. WordPress media idempotency is therefore **UNVERIFIED**.

## ROLLBACK CONTRACT

**PROPOSED partial-failure behavior:**

| Failure point | Required behavior |
|---|---|
| Source fetch | No R2 or database mutation; return a structured failure. |
| After R2 upload | Record the temporary object key in an in-memory/run manifest; delete it in `finally` if the run is isolated/dry-run and persistence has not committed. |
| After metadata persistence | Delete the temporary row and object in reverse order, with cleanup errors reported separately. |
| After relationship creation | In a dry run, remove the temporary relationship and asset record; never delete unrelated production media. In a future production run, use an explicit migration manifest rather than broad rollback. |

The implementation must make cleanup idempotent: deleting an already-absent object or temporary row should be treated as a successful cleanup state where the provider permits it.

**VERIFIED:** The health route demonstrates best-effort `finally`-style cleanup conceptually through its error path, but no generic media migration transaction or rollback manifest exists.

## DRY-RUN CONTRACT

**PROPOSED isolation namespace:**

```text
site-assets/wordpress-dry-run/<run-id>/<provider>/<attachment-id>/original.<ext>
site-assets/wordpress-dry-run/<run-id>/<provider>/<attachment-id>/webp/w-<width>.webp
```

The namespace must be unique per run and must never overlap the eventual production namespace. The dry run should create a temporary `content_media` row only if the reviewed test contract requires database validation; its ID must be run-qualified and cleanup must occur in `finally`.

**PROPOSED fixture strategy:**

- Prefer a synthetic/local fixture containing WordPress-like attachment metadata and image bytes when source access is unavailable.
- If a live fixture is later approved, require an explicit provider, attachment ID, and source URL; do not crawl the archive.
- Download exactly one bounded object with TLS verification enabled, size and MIME limits, and a timeout.
- Do not rewrite editorial content or relationships during the fixture run.

**Required dry-run assertions:**

1. Source metadata and bytes are read.
2. Provider-qualified identity is deterministic.
3. Original object key is deterministic and isolated.
4. Uploaded bytes match source checksum/length.
5. Head metadata matches expected MIME, size, and dimensions.
6. Delivery URL has the configured public-base semantics.
7. Temporary `content_media` provenance is correct.
8. A second run reuses/upserts without duplicate identity or object.
9. Object and temporary row are removed in cleanup.
10. No unrelated production object, record, or relationship changes.

## SOURCE ACCESS STATUS

### VERIFIED from existing diagnostics

| Provider | Current status |
|---|---|
| `radarcharts.net` | DNS/TCP passed previously; TLS certificate verification failed from the sandbox. REST/media API was not safely verified. |
| `remradar.wordpress.com` | Legacy public API was reachable in previous diagnostics and returned 279 posts. The currently implemented provider identifier is `legacy`, not the requested canonical `remradar`. |

### UNVERIFIED

- Live attachment metadata from either provider through a complete media endpoint path.
- Live source-byte download for a bounded attachment fixture.
- Source checksum and WordPress attachment dimensions for a selected production attachment.

### PROPOSED

Use a local synthetic fixture to validate the migration contract first. Do not disable TLS verification or use insecure certificate workarounds for `radarcharts.net`.

## REUSED ARCHITECTURE

**PROPOSED reuse:**

- `SourceProvider`/source endpoint pattern from `src/lib/editorial-migration.ts`, after canonical vocabulary review.
- `CmsRecord` source identity fields and current provider-qualified editorial reconciliation pattern.
- `content_media` schema and `upsertMediaRecord`/`deleteMediaRecord` primitives.
- `media-storage.ts` R2 client, metadata operations, URL generation, and `createWebpDerivatives`.
- Existing Studio authentication boundary for a future controlled admin-only fixture route or CLI.
- Existing scripts and fixture conventions, extended with media-specific tests rather than a parallel architecture.

## NEW COMPONENTS

**PROPOSED only; not implemented:**

1. Canonical provider/source vocabulary compatibility layer or reviewed rename.
2. WordPress attachment metadata adapter for REST/WordPress.com response shapes.
3. Deterministic media identity and R2 key functions.
4. Source fetch/byte validation with timeout, MIME, size, and checksum handling.
5. Media migration manifest/run state for partial failure and cleanup.
6. A single-fixture dry-run CLI/test using the isolated namespace.
7. Source-qualified media lookup and conflict/idempotency helpers.
8. Optional relationship mapping stage, separate from the dry-run upload stage.

## ASSUMPTIONS

- **ASSUMED:** WordPress attachment IDs are stable within a provider.
- **ASSUMED:** The existing `content_media` row can remain the canonical physical-asset record without introducing a separate media table.
- **ASSUMED:** A future schema constraint or query helper can enforce provider-plus-source-ID uniqueness without breaking existing health records.
- **ASSUMED:** Public delivery URLs will be configured separately from the R2 API endpoint before production media delivery is enabled.
- **ASSUMED:** Mother Base will approve a synthetic fixture before any live source attachment is read.

## OPEN QUESTIONS FOR MOTHER BASE

1. Should the existing `legacy` provider identifier be migrated to canonical `remradar`, or should a compatibility alias remain permanently?
2. Should `content_media` represent one original source asset with derivative metadata, or one row per physical representation?
3. Is one `content_id` sufficient, or is a separate relationship table required for inline and reused media?
4. What is the approved production namespace and public delivery domain for WordPress media?
5. Should changed bytes for the same provider-plus-attachment identity create a versioned object, a conflict state, or require manual replacement?
6. Is a synthetic fixture sufficient for the first controlled dry run, or is one explicitly selected live attachment required?
7. Should the current RADARCharts TLS issue be resolved before any source-specific test, or should only the reachable `remradar` provider be tested initially?

## RISKS

- The existing `legacy` identifier conflicts with the requested `remradar` semantic and could cause provenance confusion if reused without a compatibility decision.
- Current `content_media` uniqueness is on `id` and `storage_key`, not provider plus source attachment identity.
- Existing media storage fallback URLs use the API endpoint when no public base URL is configured; those URLs may not be suitable for public delivery.
- Source URLs in editorial content may refer to mutable or inaccessible external assets.
- Current-source TLS failure prevents safe live validation of `radarcharts.net` from the sandbox.
- A future relationship rewrite could alter editorial content unless explicitly separated from asset migration.
- Partial upload/database failure could orphan objects without a run manifest and deterministic cleanup.

## FILES LIKELY TO CHANGE — NOT CHANGED IN THIS PHASE

- `src/lib/editorial-migration.ts` — provider/attachment response integration only after contract approval.
- `src/lib/content-server.ts` — media lookup/constraint helpers only after schema review.
- `src/lib/media-storage.ts` — deterministic key, checksum, and metadata helpers only if existing primitives are insufficient.
- New `src/lib/wordpress-media-migration.ts` or equivalent — only if the reviewed architecture cannot fit cleanly in existing importer modules.
- New `scripts/media-migration-dry-run.ts` — isolated single-fixture runner.
- New media unit/contract tests under `tests/` or `scripts/` following repository conventions.
- `docs/CMS_MIGRATION_REPORT.md` — only after implementation and verification.

No files above were modified for this architecture report.

## IMPLEMENTATION PLAN AFTER REVIEW

1. **Media contract:** Confirm canonical providers, source-qualified identity, physical key namespace, row semantics, changed-byte policy, and relationship model.
2. **Single-fixture dry-run module:** Implement bounded source adapter plus synthetic fixture support, deterministic identity/key functions, checksum/metadata verification, isolated R2 namespace, temporary record, and `finally` cleanup.
3. **Idempotency test:** Run the same fixture twice; assert one logical identity, one deterministic object key, no duplicate relationship, and explicit changed-byte conflict behavior.
4. **Cleanup/rollback test:** Inject failures after fetch, upload, metadata persistence, and relationship preparation; assert no fixture objects/rows remain.
5. **Source-specific tests:** Test `radarcharts` and `remradar` response shapes independently; keep TLS verification enabled and mark unavailable current-source tests as blocked rather than bypassing TLS.
6. **Eventual controlled migration:** After review, run one explicitly approved live attachment or synthetic-to-live contract test, without rewriting editorial relationships.
7. **Eventual bulk migration:** Only after a separate Mother Base review of dry-run evidence, source accessibility, conflict policy, rollback manifest, and delivery URL configuration.

## MOTHER BASE GATE

**VERIFIED:** No production WordPress media operation occurred in this architecture phase.

**PROPOSED next step:** Mother Base review of this contract. Do not implement the migration module, run a WordPress media dry run, modify production relationships, generate production WebP derivatives, or perform bulk migration until the contract is approved.

**STOP STATUS:** Design-only phase complete; implementation intentionally not started.
