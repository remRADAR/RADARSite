# RADARSite deployment recovery — 2026-10-15

## Identified problems

- Vercel’s failed production deployment for commit `c030fbb` stopped at TypeScript checking: Playwright `evaluateAll` callbacks in `tests/e2e/article-media.spec.ts` treated generic DOM elements as images.
- GitHub CI on main (`d269474`) independently failed lint because `ResilientImage` synchronously reset React state from an effect (`react-hooks/set-state-in-effect`).
- Cleanup commits `4037ca9` and `dd326e7` removed `current-article-media-audit.json` and `current-article-media-byte-verification.json`, while the current-media migration library and authenticated API still consume them.
- The local media E2E fixture referenced an article absent from the repository’s published-content snapshot, so it loaded a 404 page instead of exercising a local override.

## Changes on the recovery branch

- Narrowed DOM results with `instanceof HTMLImageElement` in E2E assertions.
- Reset image retry/load state through a keyed inner component when `src` or `srcSet` changes; retained timer cleanup and retry behavior without synchronous effect state updates.
- Restored both migration manifests byte-for-byte from their tracked pre-deletion versions. Their records validate as JSON; audit data reports 139/139 source-byte verifications and zero unresolved attachment references.
- Updated the local media E2E case to an article present in the snapshot and to assert that its exact local featured image loads.

## Verification

- `npm test` — passed (lint: 0 errors, 6 existing warnings; TypeScript: passed).
- `npm run build` — passed; Next.js generated 498 static pages.
- `npm run test:e2e -- tests/e2e/article-media.spec.ts --workers=1 --retries=0` — 4/4 passed. The local dev run emitted hydration-mismatch diagnostics in the existing editorial enhancer/playlist components; those are not changed here.
- Passed offline contracts: `test:csp`, `test:editorial-archives`, `notion:contract-test`, `cms:workflow-contract-test`, `media:contract-test`, `postgres:adapter-contract-test`, `media-health:contract-test`, `media-relationships:contract-test`, `cms:taxonomy-contract-test`, and `cms:studio-library-mock-test`. The CMS/Notion/media contracts reported no production contact or mutation.
- Seven sequential production spot checks returned HTTP 200 for the homepage, article archive, an article page, press archive page 1, a local image asset, `robots.txt`, and `sitemap.xml`. A broader 370-route sweep received Vercel Security Checkpoint 403 responses from the sandbox runner; a later homepage request returned 200. Therefore the representative spot checks are verified, but the full production route set is not verified by this run.
- No production deployment, domain, environment, database, content, or access-control change was made.

## Outstanding risks and next gate

- `npm audit` reports 13 advisories overall (1 critical, 11 high, 1 moderate); production-only dependencies report 11 (1 critical, 9 high, 1 moderate). The critical `proxy-addr@2.0.7` finding is transitive through `shadcn → @modelcontextprotocol/sdk → express`. Dependency remediation was kept out of this deployment fix because it requires a separate dependency-change review.
- This branch has not been deployed to production. Review the PR, wait for GitHub/Vercel checks and any preview verification, and obtain the required owner approval before merging or production cutover. The GitHub branch-protection API reported no protection configured for `main`; no protection settings were changed.
