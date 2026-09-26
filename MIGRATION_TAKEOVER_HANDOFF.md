# RADARSite CMS Migration Takeover Handoff

**Checkpoint:** 2026-09-25 12:36 UTC  
**Repository:** `remRADAR/RADARSite`  
**Branch / HEAD:** `main` / `e105d81` (`Migrate legacy article media to R2 WebP`)  
**Working-tree baseline:** clean before this checkpoint

## Executive status

**PARTIALLY_VERIFIED — migration is paused.** The repository and prior migration work were reconstructed without resetting or rerunning completed work. Legacy migration evidence is intact and R2 is reachable. Continuing current-article media migration is blocked by three independent conditions: the Neon production branch is archived and quota-limited, the canonical current-media audit artifact is absent, and the current WordPress source fails TLS verification from this environment.

No current-article media was downloaded, uploaded, rewritten, or substituted during this takeover. No database writes were performed.

## Completed

- Confirmed the project is a Next.js 16 App Router application using React 19, TypeScript, Tailwind CSS, Neon PostgreSQL, Cloudflare R2, and Vercel.
- Confirmed the public read path uses a single compressed `unstable_cache` entry tagged `radarsite-public-content`, revalidated hourly.
- Confirmed Studio/admin and mutation endpoints are dynamic and return `Cache-Control: no-store`.
- Confirmed Studio writes invalidate the public content cache tag; the maintenance endpoint revalidates the tag and root layout.
- Preserved the existing `studio_content` CMS source of truth and `content_media` metadata design.
- Preserved the legacy migration as completed work:
  - 279 legacy articles
  - 897 unique legacy image objects
  - 897 successful uploads recorded
  - 1,186 R2 WebP references recorded
  - 0 unresolved WordPress URLs recorded in the legacy report
- Confirmed Cloudflare account access can list the `radarsite-media` bucket and sample `legacy/webp/` objects.
- Sampled legacy objects are `image/webp` and use `public, max-age=31536000, immutable` cache metadata.

## In progress / paused

- Production stability audit.
- Recovery of original media for the 63 current articles.
- Article-by-article media relationship verification.

The migration is intentionally paused until the blockers below are resolved.

## Blockers and evidence

### 1. Neon production branch is archived and quota-limited

Read-only Neon inspection found:

- Project: `radarcharts-studio`
- Project ID: `dry-leaf-89473620`
- Production branch: `br-snowy-block-aehpm8ym`
- Branch state: `archived`
- Autoscaling range: 0.25–2 CU
- Recorded active time: 43,824 seconds
- Recorded CPU time: 11,369 seconds
- Quota reset shown by the provider: 2026-10-01 00:00 UTC
- `get_database_tables` failed with HTTP 402: account/project quota exceeded

This is evidence of an unavailable or quota-exhausted database compute path. It is **not** evidence that query shape, connection exhaustion, or Neon alone caused historical 502s. Query and connection diagnosis remains unavailable until the branch is restored and provider observability is accessible.

**Required action:** restore/unarchive the production branch or otherwise resolve the quota/access condition, then run read-only schema, index, table-count, and query-log checks before any migration write.

### 2. Canonical current-media audit is absent

The continuation instructions identify:

- `/home/ubuntu/RADARSite/current-article-media-audit.json`
- 63 current articles
- 59 featured-media articles
- 63 inline-image articles
- 603 unique current image URLs
- 582 JPEGs and 21 PNGs

The file is absent from the current checkout, `/home/ubuntu`, and Git history. The committed repository contains no equivalent current-media manifest. Therefore no safe article-by-article batch boundary can be reconstructed from this checkout.

**Required action:** restore the canonical audit/manifest from the prior working environment, project shared files, or a legitimate export. Do not regenerate it from an unauthenticated source unless the source is first verified and the output is reconciled against the prior audit.

### 3. Current WordPress source requires authenticated recovery and valid TLS

The read-only `npm run cms:diagnose -- --json` run on 2026-09-25 found:

- `radarcharts.net`: DNS PASS, TCP 443 PASS, TLS FAIL (`unable to verify the first certificate`), HTTP/REST/media checks not run.
- `remradar.wordpress.com`: TLS PASS and public pages/feed/sitemap reachable, but it does not provide the missing current-media files and its REST probes did not return JSON.

Do not repeatedly retry the known-broken unauthenticated `radarcharts.net/wp-content/uploads/` path. The missing current assets are an **authenticated source media recovery** problem. Use the WordPress dashboard/media library, an authenticated REST API, a Jetpack/export package, or an existing legitimate backup. Do not fabricate credentials or substitute images.

## Stability audit conclusion

### What is verified

- Public content is designed to avoid a Neon query on every anonymous request: one shared cached payload is revalidated hourly, with snapshot fallback on cache-read failure.
- Public article/archive routes are configured for one-hour revalidation.
- API/admin routes are marked dynamic and no-store.
- Cache invalidation exists for Studio writes and a scheduled Cloudflare Worker safety net.
- R2 bucket existence and legacy object metadata are currently readable through Cloudflare’s API.

### What is not verified

- Current production 502 rate, request duration, memory, CPU, or serverless execution limits.
- Current Vercel runtime error logs: the available observability call returned HTTP 403.
- Current Vercel deployment detail: the recorded historical deployment lookup returned not found/permission-blocked.
- Neon table schema, indexes, connection counts, slow queries, or database logs: blocked by archived branch/quota.
- Whether the Cloudflare cache-maintenance Worker is deployed and using the verified production hostname. The committed `wrangler.toml` still points at `https://radarsite-remradars-projects.vercel.app/api/cache/maintenance`, which requires production-hostname confirmation.

### Root-cause classification

**Historical 502/quota root cause: UNKNOWN.** The available evidence proves a present Neon quota/archived-compute blocker and a prior R2 configuration incident that was later corrected, but does not prove that Neon query load caused the reported 502s. Provider-level Vercel and Neon observability must be restored before making a stronger claim.

## Current media migration state

| Metric | State |
|---|---:|
| Total articles | 342 |
| Legacy articles | 279 |
| Current articles | 63 (handoff evidence; database not verified) |
| Legacy unique images | 897 |
| Current unique images | 603 (handoff evidence; audit file missing) |
| Current JPEGs | 582 (handoff evidence) |
| Current PNGs | 21 (handoff evidence) |
| Current files recovered | 0 verified in this takeover |
| Current files converted | 0 |
| Current files uploaded to R2 | 0 |
| Featured references updated | 0 verified |
| Inline references updated | 0 verified |
| Articles fully verified | 0 |
| Unresolved assets | 603 expected; exact manifest unavailable |
| Unresolved articles | 63 expected; exact relationship manifest unavailable |
| Manual action required | Yes — restore audit, database, and authenticated source |

## Next safe sequence

1. Restore/unarchive Neon production compute and resolve the quota condition.
2. Obtain read-only schema/table/index/log evidence; do not write or run migration yet.
3. Restore `current-article-media-audit.json` and validate its counts and article relationships.
4. Obtain authenticated access to the original current WordPress media source or an approved export/backup.
5. Run a single-article, single-attachment dry run in an isolated/approved namespace.
6. Verify source bytes, MIME, dimensions, SHA-256, WebP derivative, R2 object, `content_media` record, and delivery URL.
7. Only after review, process small rate-limited batches with a durable checkpoint after every batch.
8. Update article references only after each object and relationship is verified.
9. Verify all 63 current articles individually, then run public homepage/article/CMS/cache checks.

## Durable state

Machine-readable state is stored in [`MIGRATION_TAKEOVER_STATE.json`](./MIGRATION_TAKEOVER_STATE.json). It contains counts, evidence, statuses, relevant files, blockers, and the exact next action for a future agent.

## Relevant existing files

- `src/lib/content-server.ts`
- `src/lib/media-storage.ts`
- `src/lib/editorial-migration.ts`
- `scripts/cms-diagnose.mjs`
- `scripts/run-legacy-media-migration.py`
- `legacy-media-migration-manifest.json`
- `legacy-media-migration-report.json`
- `R2_VERIFICATION_REPORT.md`
- `CMS_RECONCILIATION_AUDIT.md`
- `CLOUDFLARE_MEDIA_CACHE_PLAN.md`
- `CONTENT_READ_COST_REPORT.md`

## Final classification

- **COMPLETED:** takeover discovery, legacy migration preservation, public cache architecture audit, R2 read-only sample verification, durable checkpoint creation.
- **IN PROGRESS:** production stability diagnosis and current-media recovery.
- **BLOCKED:** Neon schema/query inspection, current-media migration, current-source unauthenticated retrieval, provider runtime observability.
- **REQUIRES HUMAN ACTION:** restore Neon access/quota, restore the missing audit artifact, provide authenticated WordPress/export access, and restore provider observability permissions if a definitive 502 root cause is required.


## Active source-panel prompt execution — 2026-09-25

The Google Doc source prompt was read successfully and executed non-destructively. The prompt’s requirement was infrastructure recovery and safe validation, explicitly **not** bulk migration.

### NEON

- **Restored:** No.
- **Quota condition:** Project metadata reports the `free_v3` plan, consumption period 2026-09-01 through 2026-10-01, 43,824 seconds active time, and 11,369 CPU seconds. Database inspection still fails with HTTP 402 quota exceeded.
- **Database health:** Not assessable because the production branch is archived and quota-blocked.
- **Connection status:** Not assessable; no connection metrics were exposed.
- **Schema status:** Not assessable; read-only table-size inspection also failed with HTTP 402.
- **Snapshots:** Neon snapshot inventory returned an empty list.
- **Recent Neon logs:** Query returned an empty list; this is not evidence that the historical 502s did not occur.
- **Human action required:** Restore/unarchive the production branch or resolve the Neon quota condition in the Neon dashboard. No restore, reset, snapshot restore, or destructive operation was attempted.

### 502 INVESTIGATION

**Proven:** The current Neon project has an archived production branch and a quota failure. The application’s source code has a shared public cache, one-hour revalidation, no-store admin/API routes, and explicit cache invalidation. R2 is reachable and legacy objects are readable.

**Unverified:** Historical 502 root cause, Vercel runtime error rates, request duration, application resource use, Cloudflare request behavior, Neon connection exhaustion, query latency, indexes, and database error history.

**Remaining observability limitations:** Vercel observability returned HTTP 403; Neon database diagnostics are blocked by HTTP 402. Therefore the historical 502 cause remains **UNKNOWN** and is not attributed to Neon.

### MEDIA AUDIT

- **Recovered:** No.
- **Location:** `current-article-media-audit.json` remains absent from the checkout, local filesystem, Git refs, and available migration artifacts.
- **Current assets confirmed:** 0 from a canonical manifest in this environment. The expected handoff counts remain 603 unique URLs, 582 JPEGs, and 21 PNGs; they are not independently re-derived here.

### WORDPRESS

- **Authenticated:** No.
- **Recovery method:** Not available in the current session. The current source still fails TLS verification from this environment. The required next method is a human-approved WordPress dashboard/media-library session, authenticated REST API, Jetpack/export package, or legitimate filesystem/database backup.

### R2

- **Existing pipeline status:** Verified by source inspection. The existing implementation uses `sharp`, deterministic/provider-qualified identities, SHA-256 checksums, metadata validation, byte verification, immutable cache headers, and cleanup on failure. The existing R2 bucket and legacy WebP samples remain reachable.
- **Test upload status:** The isolated contract tests passed with `productionContacted: false`; no real current-media upload was attempted.
- **Conversion test:** WebP smoke test passed with 1200px, 960px, and 480px derivatives.

### DRY RUN

- **Article tested:** None.
- **Attachment tested:** None.
- **Conversion result:** No production/current attachment converted; isolated smoke test passed.
- **R2 result:** No current attachment uploaded; isolated contract tests passed with zero final objects and zero final records.
- **CMS reference result:** No CMS reference changed.
- **Rendering verification result:** Not run for a current article because source authentication, audit manifest, and Neon access are unavailable.

### Validation checks

- `npm run media:contract-test` — **PASS**
- `npm run media-health:contract-test` — **PASS**
- `npx tsx scripts/media-webp-smoke.ts` — **PASS**
- `npm run lint` — **PASS**
- `npx tsc --noEmit` — **PASS**
- `git diff --check` — **PASS**
- Working tree — **CLEAN**

### NEXT ACTION

**One precise next action:** Restore/unarchive the Neon `radarcharts-studio` production branch or resolve its quota condition in the Neon dashboard, then rerun the read-only schema/table/index/connection health checks before attempting any media dry run.

Bulk migration remains prohibited until that action succeeds, the current audit is restored, authenticated source media is available, and production stability is demonstrably verified.

## Authenticated current-media audit regeneration — 2026-09-26

The self-hosted WordPress account at `radarcharts.net` was authenticated through the takeover browser. This is the correct InfinityFree-hosted WordPress source; the separate WordPress.com site was not used.

A read-only REST audit retrieved all **63 current posts** and their rendered HTML. The article relationships reconcile exactly with the prior handoff counts: **59 articles with featured media**, **63 articles with inline images**, and **zero unresolved attachment references**. The authenticated media API returned metadata for all **139 referenced WordPress attachment IDs** across two pages.

The prior handoff figure of **603 unique image URLs** represents URL variants across `src`, `srcset`, and WordPress derivative sizes. The authenticated API resolves those variants to **139 canonical attachment records**. The regenerated audit classifies **133 JPEG** and **6 PNG** canonical assets from authenticated WordPress filenames. WordPress-reported dimensions, filenames, canonical source URLs, and file sizes are included.

The regenerated files are `current-article-media-audit.json` and `current-article-media-audit.report.json`. They are explicitly marked **metadata confirmed, source bytes and SHA-256 not yet verified**. No WordPress content, Neon records, CMS records, or R2 objects were changed.

The correct next phase is not an export from WordPress.com. Once Neon access is restored, verify the source bytes and checksum for exactly one authenticated attachment, then perform the isolated R2/CMS dry-run sequence. Bulk migration remains paused.
