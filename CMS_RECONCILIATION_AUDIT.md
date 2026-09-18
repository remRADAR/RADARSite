# RADARSite CMS Reconciliation & Rendering Recovery

**Status:** PARTIAL — implementation recovered and hardened; production reconciliation is blocked by unavailable current source and storage configuration.  
**Repository:** `remRADAR/RADARSite`  
**Branch:** `main`  
**Updated:** 2026-09-18

## Recovery finding

The repository history contained the CMS migration implementation. The local checkout was stale at `7940402`; remote `main` was fast-forwarded to `b15b50ce` (`Improve responsive CMS editorial media`). The recovered migration commits are:

- `55da1a9` — Implement native RADAR editorial CMS migration
- `5d3d913` — Reconcile editorial CMS archive and sections
- `b15b50c` — Improve responsive CMS editorial media

The existing `studio_content` architecture was preserved. No second CMS was introduced and no production data was mutated.

## Current architecture

```text
public article route
→ readPublishedContent()
→ studio_content.content JSONB through DATABASE_URL
  or seed content when DATABASE_URL is unavailable
→ normalized CMS records
→ IaDetail / RichEditorialBody
→ MediaFrame
```

The migration control endpoint remains `/api/studio/migrate` and is protected by the existing Studio session. It supports dry-run operation before any write.

## Environment and source status

| Dependency | Result | Evidence |
|---|---|---|
| CMS implementation | VERIFIED | `src/lib/content-server.ts`, `src/lib/editorial-migration.ts`, admin migration panel |
| Persistent CMS database | NOT VERIFIED | No `DATABASE_URL` is available in this environment; no production records were read or changed |
| Current source | BLOCKED | `https://radarcharts.net` returned an empty TLS response from this environment during safe endpoint probes |
| Legacy source | VERIFIED | WordPress.com public API returned HTTP 200 and reported 279 posts |
| Media storage | NOT VERIFIED | No R2, S3, blob, or other storage configuration is available |
| Production apply | NOT run | Apply is intentionally blocked until current source and storage are available |

The legacy endpoint remains available only as an explicit secondary provider:

```text
https://public-api.wordpress.com/rest/v1.1/sites/remradar.wordpress.com/posts/
```

It is no longer the default importer authority.

## Implemented changes

### Source-provider abstraction

`src/lib/editorial-migration.ts` now defines explicit `radarcharts` and `legacy` providers. The default provider is the current RADARCharts source:

```text
https://radarcharts.net/wp-json/wp/v2/posts
```

It can be overridden with `RADARCHARTS_WORDPRESS_API`. The legacy WordPress.com endpoint must be selected explicitly. Records use provider-qualified reconciliation keys so a legacy record cannot overwrite a current-source record merely because both have the same numeric ID.

The migration API accepts `sourceProvider` while preserving current-source default behavior.

### Title and excerpt normalization

`src/lib/editorial-normalization.ts` now uses the `html-entities` standards-compliant decoder and performs normalization only at ingestion/reconciliation boundaries. It handles named, decimal, hexadecimal, and common WordPress entities, then applies Unicode normalization, control/zero-width character removal, whitespace normalization, HTML stripping for text fields, URL-as-title rejection, and trimming.

The regression value:

```text
ARTIST SPOTLIGHT RHIA BELLO &#8211; THE ETHEREAL SOUL OF AFRO-ALTÉ
```

normalizes to:

```text
ARTIST SPOTLIGHT RHIA BELLO – THE ETHEREAL SOUL OF AFRO-ALTÉ
```

### Reconciliation safety

The existing CMS record is preserved by default. When a `sourceSnapshot` is present, field-level three-way reconciliation distinguishes unchanged CMS values, manual CMS edits, source changes, and conflicts. Conflicting fields receive a migration warning instead of being silently overwritten.

### Image discovery

The recovered importer now discovers image candidates from `src`, `srcset`, `data-src`, `data-lazy-src`, `data-original`, `data-orig-file`, and `data-large-file`, and falls back to the first valid inline image when featured-image metadata is absent. The importer reports discovered and failed image counts and records warnings for missing media.

This is discovery and URL reconciliation only. Hosted media migration, WebP derivatives, `content_media`, object storage, and URL rewriting remain blocked until a configured storage provider is supplied.

## Verification

Passed:

```text
npm run lint
npx tsc --noEmit
npm run build
node scripts/check-title-normalization.mjs
git diff --check
```

The build completed successfully and includes `/api/studio/migrate`.

The brief’s commands `npm run typecheck` and `npm test` are not defined in the current `package.json`; the repository’s available equivalents are `npx tsc --noEmit`, `test:e2e`, and `test:a11y`.

## Remaining work before production completion

1. Restore network access or configure the verified current `radarcharts.net` WordPress endpoint.
2. Provide `DATABASE_URL` and run a read-only CMS audit through `readContent()`/`readPublishedContent()`.
3. Configure and verify the project’s existing media storage provider.
4. Add the `content_media` metadata model without replacing `studio_content`.
5. Download, validate, hash, deduplicate, convert, host, and rewrite all featured and inline media.
6. Run a dry-run current-source reconciliation and review title, taxonomy, media, and manual-edit conflicts.
7. Apply only after source, database, and storage validation.
8. Verify RHIA BELLO and WEALTH ASUQUO against the live CMS and source records.

Until those dependencies are available, the correct status is **PARTIAL**, not production complete.
