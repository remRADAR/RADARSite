# RADARCharts Production Migration Audit

**Date:** 2026-10-06
**Repository:** `remRADAR/RADARSite`
**Branch:** `main`

## Executive status

**The site is not yet safe to shut down on InfinityFree.** Cloudflare is active and DNS records are pointed at Vercel, but Vercel still reports the apex and `www` domains as pending verification. The current media audit also shows that the 63 current WordPress articles still reference the old WordPress/InfinityFree media origin.

The 279 legacy articles have already been imported into the committed snapshot with R2-backed media. The current-source media migration remains a separate, gated operation because production database/storage reconciliation has not been safely completed.

## Verified

- Cloudflare zone `radarcharts.net` is active.
- Authoritative DNS records include:
  - Apex A record: `76.76.21.21`
  - `www` CNAME: `cname.vercel-dns.com`
  - Vercel ownership TXT records under `_vercel.radarcharts.net`
  - Existing ImprovMX mail records and SPF preserved.
- Vercel project: `radarsite`.
- Vercel custom domains exist for `radarcharts.net` and `www.radarcharts.net`; both were still reported as `verified: false` at audit time.
- The content snapshot contains **342 published article records**:
  - 279 legacy records
  - 63 current WordPress records
- Current content coverage in the snapshot:
  - 342/342 featured images present
  - 342/342 body HTML records present
  - 305 articles contain embeds or rich media markers
  - 329 iframe embeds detected: YouTube and Spotify
  - 711 inline image references detected
- Legacy media evidence records 897 successful R2 uploads and 1,186 R2 WebP references.
- The current-source audit records 139 canonical attachments, all with verified source bytes and no unresolved attachment references.
- Current source media migration is **not complete**:
  - 63/63 current article featured images still reference `radarcharts.net/wp-content/...`
  - 83 inline image references still reference the WordPress origin
  - Current-source R2/CMS relationship migration remains paused.

## Implemented in this pass

- Environment-gated GA4 instrumentation with route-change pageview tracking:
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- Optional Google Search Console verification metadata:
  - `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
- CSP allowances for Google Tag Manager/Analytics endpoints.
- Permanent redirects generated from the current snapshot for current WordPress date URLs:
  - `/YYYY/MM/DD/article-slug/` → `/ontheradar/articles/article-slug`
- Permanent redirects for unique current WordPress `?p=ID` article links.
- Article-level generated branded Open Graph cards remain active at `/api/social-card/{slug}`.

## Not yet verified

- Vercel custom-domain verification and production TLS certificate issuance.
- Live HTTPS responses on the apex and `www` hostnames.
- Google Analytics collection, because the production GA4 measurement ID has not been supplied/configured.
- Google Search Console ownership, because the verification token has not been supplied/configured.
- Current-source WordPress media upload, R2 checksum verification, `content_media` relationship creation, and content URL rewrite.
- Redirect behavior on live DNS before Vercel finishes custom-domain verification.

## Safe next gate

1. Wait for Vercel to mark both custom domains verified and issue the certificate.
2. Confirm the Vercel production deployment is `READY`.
3. Add the real GA4 measurement ID and, if used, Search Console token in Vercel Production environment variables.
4. Restore/confirm production database access and run the already-scoped current-media migration with a manifest, bounded batches, checksums, and rollback evidence.
5. Re-run live article, image, embed, redirect, sitemap, robots, and metadata checks.
6. Only then disable or remove the InfinityFree site.

**Do not delete the InfinityFree site or remove its media yet.** Existing current article images and unverified legacy URLs may still depend on it until the current-media migration and live redirect verification are complete.
