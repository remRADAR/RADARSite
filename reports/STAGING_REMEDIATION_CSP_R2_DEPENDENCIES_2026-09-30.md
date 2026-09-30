# Staging Remediation Evidence: R2 CSP and Patched Dependencies

**Date:** 2026-09-30
**Branch:** `staging/csp-r2-dependency-reconciliation`
**Base:** `radar-ambient-sound-engine` / `origin/cms-integration-2026-09-29`
**Production changes:** none

## Implemented

### R2 CSP and image configuration

- Added `src/lib/public-media-origin.ts` for exact HTTPS-origin validation.
- `R2_PUBLIC_BASE_URL` is normalized to an origin and rejects credentials, paths, queries, fragments, non-HTTPS URLs, malformed values, and private R2 endpoints.
- The validated public R2 origin is added to both:
  - Next image `remotePatterns`;
  - CSP `img-src`.
- Replaced brittle CSP string replacement with a structured, deduplicated public-image origin list.
- Preserved the approved Unsplash, RADARCharts CDN, WordPress, and `i0.wp.com` origins.
- Added `scripts/csp-contract-test.ts` and `npm run test:csp`.

### Dependency baseline

The staging manifest and lockfile now use the patched baseline:

| Package | Staging version |
|---|---:|
| `next` | 16.3.7 |
| `eslint-config-next` | 16.3.7 |
| `sharp` | 0.35.5 |
| `@img/sharp-linux-x64` | 0.35.5 |
| `@img/sharp-libvips-linux-x64` | 1.3.4 |
| `esbuild` | 0.28.2 |
| `allowScripts` | exact reviewed entries for esbuild, unrs-resolver, Sharp |

The lockfile was regenerated from the merged manifest, then remediated with `npm audit fix --package-lock-only` to include the non-breaking transitive security updates.

## Verification

### Passed

- `npm ci --no-audit --no-fund`
- `npx npm@11.16.0 approve-scripts --allow-scripts-pending`
- `npm audit --audit-level=moderate` — **0 vulnerabilities**
- `npm run test:csp`
- CMS taxonomy contract test
- Editorial archive contract test
- Studio library mock contract test
- CMS workflow contract test
- `npm run media:contract-test`
- `npm run media-relationships:contract-test`
- `npx tsc --noEmit`
- `npm run lint` — zero errors; one existing Studio `<img>` warning
- `git diff --check`
- `npm run build` with `R2_PUBLIC_BASE_URL=https://pub-2d7f41f7140544c480801d8b90da765e.r2.dev` — Next.js 16.3.7, 416/416 pages generated
- Sharp runtime — 0.35.5 / libvips 8.18.7 / 19 input formats
- esbuild runtime — 0.28.2

### CSP header assertions

The built staging server returned a CSP containing:

```text
https://pub-2d7f41f7140544c480801d8b90da765e.r2.dev
```

Assertions passed that the header contains no wildcard R2 source and no private `r2.cloudflarestorage.com` endpoint.

### Responsive staging matrix

Playwright Chromium tested Press and Spotlight page 1 and page 2 at mobile `390×844` and desktop `1440×1000`.

| Viewport | Archive | Cards/page | Layout | Overflow | Console errors | Request failures |
|---|---|---:|---|---|---:|---:|
| Mobile | Press | 10 | Stacked | None | 0 | 0 |
| Mobile | Spotlight | 10 | Stacked | None | 0 | 0 |
| Desktop | Press | 10 | Two columns | None | 0 | 0 |
| Desktop | Spotlight | 10 | Two columns | None | 0 | 0 |

Page 1 Next and page 2 Previous links passed in all four cases. The earlier Spotlight CSP failures were not reproduced after the fix.

## Safety boundaries

- No Production variables changed.
- No Vercel Production deployment performed.
- No database, WordPress, R2 bucket, DNS, or editorial data mutation performed.
- The R2 URL used in local staging verification is a public delivery origin, not a credential or private storage endpoint.

## Remaining gate

The branch is ready for an authorized isolated Preview deployment with the Preview-scoped `R2_PUBLIC_BASE_URL` configured. Before Production promotion, verify the deployed CSP header and rerun the same responsive matrix against the Preview URL.
