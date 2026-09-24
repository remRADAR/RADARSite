# RADARSite Content Read Cost Fix

**Branch:** `fix/content-read-cost`  
**Base:** `087a41f`  
**Scope:** Public content reads only; no Neon connection was made during local build or tests.

## Implementation

Public content now uses `readPublicContent()`, backed by a shared `unstable_cache` entry tagged `radarsite-public-content` and revalidated every 3,600 seconds. The cache stores a gzip-compressed, base64-encoded snapshot of the normalized content to remain below Next.js's 2 MB cache-entry limit. Article metadata and article rendering share that same cache entry.

If a public database read fails, the error name and message are logged without secrets and the committed `src/data/merged-content.json` snapshot is returned. Studio reads remain uncached and do not silently fall back. Studio content publish invalidates the public cache tag after a successful write.

The build script sets `RADAR_SKIP_DATABASE=1`, and the content reader checks that flag before creating a Neon client query. Therefore static generation uses the committed snapshot and does not require a live database.

## Route policy

The homepage, On The Radar landing page, article archive, article detail pages, magazine routes, section routes, generic CMS pages, and sitemap use one-hour ISR or the shared public cache. Article detail pages use `generateStaticParams()` and `dynamicParams = false`, so the committed snapshot generated 342 article paths during the verified build.

## `studio_content` read-path inventory

| Path | Read behavior | Frequency per visitor request |
|---|---|---:|
| `src/lib/content-server.ts:readContentUncached()` | Raw `studio_content` read used by uncached Studio GETs and explicit server callers | At most once per uncached caller; not used by static build because `RADAR_SKIP_DATABASE=1` |
| `src/lib/content-server.ts:readPublicContent()` | Shared compressed cache; on cache miss it invokes the public read once, with snapshot fallback | Normally zero database reads per request after cache fill; at most one shared read per cache revalidation window |
| `src/app/api/studio/route.ts:GET` | Explicit uncached Studio read for authenticated/admin data loading | Once per Studio GET request when database is configured; excluded from public page traffic |
| `src/app/api/studio/route.ts:PUT` | Writes `studio_content`; does not read it, then invalidates the public tag | Zero `studio_content` reads |
| Public metadata/page routes | Use `readPublishedContent()` → `readPublicContent()` | Shared cache; metadata and page render reuse the same cached payload |
| `src/app/sitemap.ts` | Uses `readPublicContent()` with one-hour ISR | One shared read per ISR regeneration, not per crawler request |

Other Studio migration/media routes can access related tables or write content as part of explicit admin operations; they are not part of public page rendering and were not changed to use the public fallback.

## Local verification

- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `npx tsx scripts/test-effective-image-url.mjs` — 12 assertions passed.
- `npm run media:contract-test` — passed; no production contact.
- `npm run media-health:contract-test` — passed; no production contact.
- `npm run build` — passed with `RADAR_SKIP_DATABASE=1`; static generation completed 384 pages and reported one-hour ISR for the homepage, On The Radar, article archive, article details, and sitemap.

## Staging verification to complete

The staging deployment must be checked for the homepage, article archive, and three article pages: two `radarcharts` records and one `legacy` record. Each article must expose a title, H1, canonical URL, `og:url`, `og:image`, and `twitter:image`. Requests must remain successful when the database is unreachable because these pages are generated from the committed snapshot.

Production deployment and production data were not targeted by this branch.
