# RADAR Archive Taxonomy and Routing Correction

**Date:** 2026-09-29  
**Branch:** `radar-ambient-sound-engine` based on `origin/cms-integration-2026-09-29`  
**Commit:** final isolated commit in `git log -1`  
**Production deployment or merge:** none

## Implemented

The public editorial model is now normalized to exactly:

```text
RADARArticles
├── Press
└── Spotlight

Motherland
└── independent project association / surface

Magazine
├── Special Episode
└── Magazine Episode
```

No new public editorial category was added. The imported snapshot was not rewritten, no database write was performed, and no production data was changed. Classification is deterministic at the taxonomy/archive boundary and future WordPress imports now write canonical taxonomy fields while retaining source metadata.

## Classification rules

1. Exact canonical `editorialType` values `Press`, `Spotlight`, and `Magazine` are authoritative.
2. Legacy `spotlight` values, `Discovery Spot` metadata, and artist-Spotlight title/slug evidence map to `Spotlight`.
3. Legacy `article`/`interview` records in `RADARArticles` map to `Press` when no stronger Spotlight or Magazine evidence exists.
4. Legacy `magazine` values and `TALK TO US` metadata map to `Magazine`.
5. `TALK TO US: Special Guest Episodes` maps to `Special Episode`; `TALK TO US: Magazine Series` maps to `Magazine Episode`.
6. `Motherland` is read independently from editorial type. A record can therefore be `Spotlight + Motherland` and appears in both surfaces without duplication.
7. Explicit `Magazine` without a valid subtype is not silently assigned a subtype; it is marked for review by `deriveEditorialTaxonomy` and rejected by Studio save validation until corrected.
8. Unrecognized records remain reviewable instead of being assigned a new public category.

## Snapshot reconciliation

Source: committed `src/data/merged-content.json`, 342 article records. Counts below are produced by running `deriveEditorialTaxonomy` over the snapshot.

| Measure | Count |
|---|---:|
| Total article records | 342 |
| Press | 214 |
| Spotlight | 91 |
| Magazine | 37 |
| Magazine / Special Episode | 21 |
| Magazine / Magazine Episode | 16 |
| Motherland-associated | 21 |
| Spotlight + Motherland overlap | 8 |
| Manual-review records | 0 |
| Invalid or missing canonical taxonomy | 0 |
| Duplicate slugs | 0 |
| Draft or archived records in snapshot | 0 |

The three primary editorial type counts reconcile exactly: `214 + 91 + 37 = 342`. Motherland is an association, so its 21 records intentionally overlap the editorial-type totals.

The two separate legacy `magazine` collection stories remain on the existing standalone Magazine story surface as featured content. They have no source subtype metadata, so the public page does not invent a Special Episode or Magazine Episode classification for them.

## Public routing

### RADARArticles

- `/ontheradar/articles` is now navigation-first and exposes only Press and Spotlight paths; it no longer dumps a mixed Latest feed.
- `/ontheradar/articles/press/page/1` and subsequent pages contain only canonical Press records.
- `/ontheradar/articles/spotlight/page/1` and subsequent pages contain only canonical Spotlight records.
- Both archives use 10 records per page, newest publication date first, with current RADARCharts imports before legacy imports and a deterministic slug tie-breaker.
- Draft and archived records are excluded.
- Article cards continue to link to the canonical `/ontheradar/articles/[slug]` identity.

### Motherland

- `/motherland` uses the independent `projectSection`/association filter.
- A Motherland-associated Spotlight remains discoverable in Spotlight and Motherland.
- No duplicate article record or alternate detail identity is created.

### Magazine

- `/ontheradar/magazine` is separate from RADARArticles.
- The page presents Featured standalone Magazine content, Special Episodes, and Magazine Episodes.
- Magazine subtype sections link article records to their canonical `/ontheradar/articles/[slug]` URL.
- Legacy `/ontheradar/magazine/[story]` detail resolution now finds canonical Magazine article records first while preserving standalone Magazine story compatibility.
- Magazine records do not enter Press or Spotlight archives.

### Legacy aliases

- `/ontheradar/discovery` redirects to the canonical Spotlight archive.
- `/ontheradar/talk-to-us` redirects to the canonical Magazine surface.
- `/ontheradar/motherland` redirects to `/motherland`.
- Unsupported legacy section names are no longer exposed as new public editorial archive types.

## Studio behavior

The existing Studio controls already expose only:

- Editorial type: Press, Spotlight, Magazine
- Magazine subtype: Special Episode, Magazine Episode
- Project association: None, Motherland

The corrected derivation now presents legacy records as Press/Spotlight/Magazine instead of incorrectly labeling supported legacy RADARArticles records as review-only. Studio server validation still rejects missing or mismatched Magazine subtypes and invalid project values. `Spotlight + Motherland` remains a valid expected combination.

## Tests and evidence

### Passed

- `npm run cms:taxonomy-contract-test`
- `npm run test:editorial-archives`
- `npm run cms:studio-library-mock-test`
- `npm run cms:workflow-contract-test`
- `npx tsc --noEmit`
- `npm run lint` — zero errors; one pre-existing `@next/next/no-img-element` warning in `src/components/admin/CmsStudioPanel.tsx`
- `npm run build` — 416/416 static pages generated, including 20 Press pages and 10 Spotlight pages
- `git diff --check`
- Built-server smoke checks: HTTP 200 for RADARArticles landing, Press pages 1–2, Spotlight page 1, Motherland, Magazine, and a representative Spotlight article detail.
- Legacy alias responses emitted the expected Next redirect sentinel to Spotlight and Magazine destinations in the local built server.

### Focused contract coverage

The new archive contract test covers Press filtering, Spotlight filtering, Motherland overlap, Magazine subtype filtering, current-before-legacy ordering, deterministic pagination, and draft exclusion. Existing Studio contracts cover invalid taxonomy rejection, partial-update preservation, JSON-LD, and database isolation.

## Files changed

- `src/lib/cms-taxonomy.ts`
- `src/lib/editorial-archives.ts`
- `src/lib/editorial-migration.ts`
- `src/components/marketing/ArchivePagination.tsx`
- `src/components/marketing/IaPages.tsx`
- `src/app/(marketing)/ontheradar/articles/page.tsx`
- `src/app/(marketing)/ontheradar/articles/press/page/[page]/page.tsx`
- `src/app/(marketing)/ontheradar/articles/spotlight/page/[page]/page.tsx`
- `src/app/(marketing)/ontheradar/[section]/page.tsx`
- `src/app/(marketing)/motherland/page.tsx`
- `src/app/(marketing)/ontheradar/magazine/page.tsx`
- `src/app/(marketing)/ontheradar/magazine/[story]/page.tsx`
- `scripts/cms-taxonomy-contract-test.ts`
- `scripts/editorial-archives-contract-test.ts`
- `package.json`
- `DEVELOPMENT_HANDOFF.md`
- `reports/RADAR_ARCHIVE_TAXONOMY_AND_ROUTING_2026-09-29.md`

## Not performed

- No media migration, media upload, WordPress mutation, R2 mutation, database migration, Neon/Supabase Production access, DNS change, Vercel Production deployment, social connection, social publication, or merge to `main`.
- No imported article record was duplicated or rewritten in the snapshot.
- Real external-provider Preview data reconciliation remains a separate authorized gate; this report covers the committed snapshot and isolated local runtime.
