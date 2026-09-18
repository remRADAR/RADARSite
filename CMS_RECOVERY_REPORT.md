# RADARSite CMS Recovery Report

**Date:** 2026-09-18  
**Mode:** Read-only diagnostics and dry-run reconciliation  
**Writes performed:** No

## Source hierarchy

| Role | Source | Provider | Status |
|---|---|---|---|
| Primary | `https://radarcharts.net` | Current WordPress | **BLOCKED_OR_UNVERIFIED** from this environment |
| Secondary | `https://remradar.wordpress.com` | Legacy WordPress.com | **AVAILABLE** |

The legacy provider was not promoted to primary and was not used to overwrite current-source records.

## Current-source diagnostics

| Check | Result |
|---|---|
| DNS | PASS — `185.27.134.215` |
| TCP 443 | PASS |
| TLS | FAIL — certificate verification: unable to verify the first certificate |
| HTTP | Not run after TLS failure |
| REST API | Not run after TLS failure |
| RSS | Not run after TLS failure |
| Sitemap | Not run after TLS failure |
| Known article URL | Not run after TLS failure |
| Overall | `BLOCKED_OR_UNVERIFIED` |
| Failure classification | `TLS_FAILURE` |

This is an environment/source-connection limitation, not evidence that the WordPress content is empty or missing. TLS verification was not disabled.

## Legacy-source diagnostics

| Check | Result |
|---|---|
| DNS | PASS — `192.0.78.12`, `192.0.78.13` |
| TCP 443 | PASS |
| TLS | PASS — TLS 1.3 |
| Homepage | HTTP 200 |
| WordPress REST root probes | HTTP 404 for `/wp-json/wp/v2/`; HTML 200 responses for `rest_route` probes, not JSON API payloads |
| RSS | HTTP 200 at `/feed/` and `/?feed=rss2` |
| Sitemap | HTTP 200 at `/sitemap.xml`; WordPress sitemap paths returned 404 |
| Known article URL | HTTP 200 |
| Overall | `AVAILABLE` |

The legacy WordPress.com public API remains separately supported by the importer and returned **279 posts** during the dry run.

## Dry-run reconciliation

| Metric | Result |
|---|---:|
| CMS database configured | No |
| Existing local/seed article records | 2 |
| Existing source-identified local records | 0 |
| Legacy source posts discovered | 279 |
| Records imported in dry-run | 279 |
| Records updated | 0 |
| Records skipped | 0 |
| Failed records | 0 |
| Images discovered | 279 |
| Images without a discovered featured/inline URL | 0 |
| Writes performed | 0 |

The successful legacy run proves the recovered adapter, entity normalization, source-qualified record generation, and dry-run boundary operate without a database connection. It does **not** authorize applying legacy content to production.

The current-source dry run correctly failed closed with `fetch failed` because the sandbox could not complete TLS verification for `radarcharts.net`.

## Database state

```text
DATABASE_URL: NOT_CONFIGURED
studio_content records: NOT VERIFIED
production writes: 0
```

No credentials were printed, inferred, or fabricated.

## Media state

| Media stage | Status |
|---|---|
| Source image discovery | Implemented for featured image and inline `src`, `srcset`, lazy/source attributes |
| Source image validation | URL validation implemented |
| Hosted storage provider | Not configured |
| `content_media` persistence | Not implemented because provider credentials/storage target are unavailable |
| Original downloads | Not performed |
| Hashing/deduplication | Not performed |
| WebP derivatives | Not generated |
| Article HTML rewrite | Not performed |
| Featured-image hosted URLs | Not created |
| Production media migration | **PENDING** |

The system preserves source URLs and records media warnings rather than falsely marking assets as hosted.

## Code changes in this recovery step

- Added `scripts/cms-diagnose.mjs` with DNS, TCP, TLS, HTTP, REST, RSS, sitemap, known-URL, retry, timeout, redirect, and failure classification checks.
- Added `scripts/cms-reconcile.ts` as an explicit dry-run/apply boundary.
- Added `npm run cms:diagnose`.
- Added `npm run cms:reconcile -- --source=radarcharts.net --dry-run`.
- Preserved current-source authority and the legacy provider as explicit fallback only.
- Added the report’s source-health distinction between `BLOCKED_OR_UNVERIFIED` and empty content.

## Final status

```text
PARTIAL — source diagnostics and read-only recovery are complete.

PRODUCTION MEDIA MIGRATION: NOT EXECUTED.
```

To continue with hosted WebP migration, the deployment environment must provide both:

1. A verified `DATABASE_URL` for `studio_content`.
2. An approved object-storage provider and its runtime credentials/configuration.

The current-source endpoint must also be reachable with valid TLS from the execution environment. The migration should then be run first as a dry run, reviewed, and only applied explicitly with production confirmation.
