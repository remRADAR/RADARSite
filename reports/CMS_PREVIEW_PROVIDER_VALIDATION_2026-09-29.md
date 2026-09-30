# CMS Preview Provider Validation — 2026-09-29

## Status

**PARTIALLY VERIFIED / FIXES REQUIRED.**

The isolated Preview deployment built successfully and public routes rendered. Authentication/session behavior was verified. Real provider-backed Studio reads were attempted through the authenticated Preview, but the Preview Neon database returned HTTP 402 quota exhaustion, causing the Studio article library to return HTTP 503. No Studio writes or test-record mutations were attempted after this blocker was observed.

## Deployment identity

| Field | Observed value |
|---|---|
| Branch | `cms-integration-2026-09-29` |
| Base | `main@0148ede` |
| Deployed commit | `343e672eab05d2ab9d5306eacb965149c812dc41` |
| Deployment ID | `dpl_9Edkd6gtXwohQkWVnzDCDhsrzesM` |
| Vercel project | `radarsite-staging` |
| Project ID | `prj_2ePtA6DB9iMq8EP2hfukE3D2W93H` |
| Deployment state | `READY` |
| Target | Preview (`target: null`, branch preview deployment) |
| Region | `iad1` |
| Preview URL | https://radarsite-staging-ndj6y3jbn-remradars-projects.vercel.app |
| Branch alias | https://radarsite-staging-git-cms-integration-ebb25f-remradars-projects.vercel.app |
| Git source | `remRADAR/RADARSite`, ref `cms-integration-2026-09-29` |

The branch was pushed to the authorized GitHub repository solely so the linked staging project could create this Preview deployment. `main` was not changed or merged.

## Environment/provider identity

Vercel project metadata showed separate Preview-scoped and Production-scoped environment entries for `DATABASE_URL` and `STUDIO_ADMIN_PASSWORD`. Secret values were not decrypted, displayed, logged, or copied.

Runtime error evidence identifies the Preview database provider as **Neon**. The Preview Neon endpoint returned:

```text
HTTP status 402
Your account or project has exceeded the quota.
```

This is an environment/provider availability blocker, not a code-build failure. No Production environment variables were modified.

## Automated checks

All rerun automated checks passed from the deployed branch:

```text
npm run cms:taxonomy-contract-test
npm run cms:workflow-contract-test
npm run media:contract-test
npm run media-health:contract-test
npm run media-relationships:contract-test
npm run lint
npx tsc --noEmit
git diff --check
npm run build
npx playwright test tests/e2e/cms-studio.spec.ts --workers=1
```

Results:

- CMS taxonomy contract: passed
- CMS workflow contract: passed, including partial-update preservation, explicit clearing, taxonomy, tags, JSON-LD, and JSON-LD script safety
- Media contract: passed
- Media-health contract: passed
- Media-relationships contract: passed
- TypeScript: passed
- Build: passed; 384 static pages generated
- Diff check: passed
- Focused browser suite: 3 passed
- ESLint: passed with one non-blocking `@next/next/no-img-element` warning in `CmsStudioPanel.tsx`

These local contract/browser tests do not substitute for provider-backed validation.

## Authentication/session results

**Verified:** the Preview `/admin` route initially showed the Studio password gate. After secure user takeover, the authenticated Editorial Desk opened and the browser session persisted sufficiently for the Studio API request to be made.

The authenticated Studio page exposed the CMS library controls, including categories, status, Motherland/project, Magazine format, sorting, and search controls.

## Real provider-backed Studio results

### Attempted

The authenticated browser requested:

```text
GET /api/studio?view=library&page=1&pageSize=12
```

Observed response:

```text
HTTP 503
{"error":"Article library is unavailable"}
```

### Runtime cause

Vercel runtime logs for the exact Preview deployment recorded repeated failures from `content-server` and `/api/studio`:

```text
NeonDbError
Server error (HTTP status 402): Your account or project has exceeded the quota.
```

### Not attempted after blocker

Because the first real provider-backed read failed, the following were **not attempted**:

- Existing article load
- Pagination/search/sort/filter validation against live records
- One-field edit and reload
- Explicit nullable-field clearing
- New draft creation
- Publish/update verification
- Featured-media persistence
- Tag preservation against live records
- SEO metadata persistence
- Live Press/Spotlight/Magazine/Motherland mutation behavior

No test article was created or modified. Cleanup status is therefore **not applicable**.

## Public route results

The following Preview routes rendered successfully in the authenticated browser:

| Route | Result | Evidence |
|---|---:|---|
| `/ontheradar/articles` | 200/rendered | 221 Press entries and 84 Spotlight entries visible in page content |
| `/ontheradar/articles/[article]` | rendered | Representative Wealth Asuquo article opened successfully |
| `/ontheradar/magazine` | 200/rendered | Magazine and Special Episode entries visible |
| `/motherland` | 200/rendered | Motherland-associated and Spotlight content visible |

The public article and listing routes used the committed content snapshot fallback after Neon quota errors. Runtime logs explicitly recorded a 200 for `/ontheradar/articles` with `Public content read failed; using committed snapshot`.

## JSON-LD and security results

On the representative article detail route, the browser found two JSON-LD scripts:

1. Existing Organization schema
2. Article schema

The Article schema parsed successfully and contained headline, description, author, publisher, publication date, image, article section, Motherland association, keywords, and canonical article path data.

The browser inspected the serialized script text and confirmed:

```text
rawHasClosingScript: false
JSON.parse: successful
```

Local contract and browser tests also covered hostile script text, event-handler-style HTML, and sandboxed preview behavior. A real provider-backed hostile-content write was not attempted because Studio persistence was blocked before any write could be safely performed.

## Preview runtime/log observations

Observed:

- Preview build reached `READY`.
- Vercel build compiled successfully and finished TypeScript.
- Vercel build emitted warnings about missing lockfile SWC dependencies and npm install scripts approval; these did not fail the build.
- Studio API requests returned 503 due to Neon quota exhaustion.
- Public content requests fell back to the committed snapshot and returned successfully.
- No unexpected redirect occurred after Vercel SSO authentication.
- No leaked secret values were observed in the inspected build/runtime logs.
- No client-side exception was reported in the browser console during the observed authenticated Studio load.

## Production-safety verification

No changes were made to:

- `main`
- Neon Production schema or data
- Production Vercel environment variables
- Supabase Production
- R2
- WordPress
- DNS
- Redirect activation infrastructure
- Production articles or media

The only external repository/deployment action was pushing the already committed CMS branch and allowing the linked `radarsite-staging` project to create a Preview deployment. Vercel environment metadata was read without decrypting secrets. No Studio mutation request was sent after the provider blocker was identified.

## Defects and limitations

### Blocking defect

The Preview `DATABASE_URL` resolves to a Neon project/account that has exceeded quota. The resulting HTTP 402 makes the real Studio library unavailable through a 503 response. Provider-backed CMS validation cannot proceed until an authorized, non-production Preview database is available and configured.

### Non-blocking warnings

- ESLint reports one `<img>` warning in the CMS editor.
- Vercel reports lockfile/SWC dependency and install-script approval warnings.

### Validation limitations

- Live Studio read/write, record persistence, and cleanup remain unverified.
- The public route results are snapshot-fallback results rather than database-backed content results.
- Real hostile-editorial-content persistence was not exercised.
- No Preview environment variable values were decrypted or inspected beyond key/target metadata.

## Recommendation

**Fixes required before merge review.**

Do not merge this CMS branch based on this Preview run. First provide an authorized isolated Preview Neon database with sufficient quota, configure only the Preview-scoped `DATABASE_URL`, redeploy the exact branch, and rerun the complete provider-backed Studio matrix. Do not reuse or alter Neon Production. After successful live read/write validation and cleanup verification, update this report to a verified result and request a separate human merge-review gate.

## Hard stop

This validation stops here. It does not merge to `main`, migrate WordPress articles, migrate media, upload to R2, activate redirects, change DNS, or deploy to Production.
