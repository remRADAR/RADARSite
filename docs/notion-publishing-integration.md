# Notion → RADARSite publishing integration

## Current state

The connected Notion account can access the `RADARCharts` profile page, but the supplied editorial data-source ID and the supplied editorial-plan/operating-guide page IDs are not accessible to that connection. Workspace search did not find the editorial database or those documents. Do not guess or replace their IDs. This document therefore records the implementation contract in the repository; it does not claim to update the inaccessible Notion plan.

At implementation start, `remRADAR/RADARSite` was clean on `main` at `5f80c0da1f7336894168b8d404bc03a6b859cc39`. The authenticated Vercel team is `remradar's projects` (`team_3lo8Ze3pixAFwAws1RrMkr02`); the existing `radarsite` project is `prj_Ntdr68Qf464bFdRMma0MZmmwyyPf`, linked to `remRADAR/RADARSite`. `radarcharts.net` and `www.radarcharts.net` are assigned, and the latest production deployment `dpl_Dj5gkzF2HAQgGGx2n3VXretumU1s` is READY from `main`. The Vercel environment-variable inventory had no Notion token, data-source ID, sync secret, or publishing flag. `DATABASE_URL` is configured for Production and Preview, but encrypted values were not decrypted; whether Preview points to an isolated Neon database is therefore **unverified**, and no CMS write test was run. R2 endpoint/account/access-key/secret/bucket settings are Production-only; the public media base URL is present in Production and Preview. The local sandbox had no Notion, database, or R2 credentials. No production setting, content, or deployment was changed during this work.

## Implementation contract

The receiver is `POST /api/integrations/notion/publish`. It accepts only `{ "pageId": "<Notion page UUID>" }`, optionally with `"dryRun": true`. It reads the configured data-source schema, retrieves that exact page, verifies its parent data source, checks the explicit approval state and publish checkbox, reads all paginated and nested content blocks, sanitizes supported content, imports public images into the existing R2/media relationship architecture, and upserts one RADARSite article using the existing Studio normalizer and shared CMS store.

A source identity is the normalized Notion page UUID (`sourceProvider: notion`, `sourceId` and `notionPageId`); new records receive a deterministic CMS ID even though the shared Studio normalizer otherwise generates a random ID for new records. Repeated requests resolve that same identity. CMS writes use compare-and-swap against the exact current `studio_content.content` JSONB value, retry bounded concurrent changes, and do not replace data when a competing write wins. Existing manual CMS edits are compared with the last synced source snapshot. A conflict is reported and marked `Sync Status = Conflict`; conflicting content is not overwritten. New slug, CMS ID, and canonical-URL collisions fail closed.

The route requires an explicit `Approved` state and a checked `Publish to RADARSite` box. `Publishing` may resume only when its CMS record already exists. A `Published` page is a CMS-idempotent no-op when its current source and CMS-managed fields still match; changed content requires returning the page to `Approved`. A future `Scheduled Publish Date` is rejected because scheduled publishing has not been enabled. Before entering `Publishing`, after that transition, immediately before the CMS CAS, and before final status writeback, the route re-fetches the page and rechecks its data-source parent, approval/status, edit timestamp, and properties; it also re-renders the page blocks and compares a content fingerprint that is independent of changing R2 delivery URLs. Detected drift returns a conflict before a new CMS write. Recovery/error paths update only the integration-owned `Sync Status` unless the original status can first be revalidated, so a newer editor status is not intentionally reset. Successful publication writes CMS content with CAS, reconciles media relations, revalidates the shared content tag and editorial paths, and only then marks Notion `Published`/`Synced` and writes the CMS ID, canonical URL, page ID, and sync timestamp. A failed final Notion writeback returns a retryable error; the stable page/CMS identity makes the retry idempotent. Notion does not offer a conditional revision token for page PATCH in this flow, so an irreducible race remains between the last GET/revalidation and the subsequent PATCH; this is not equivalent to an atomic Notion compare-and-swap.

The integration is disabled unless `RADAR_NOTION_PUBLISHING_ENABLED=true`. Dry-run performs no Notion writes, CMS writes or DDL, media uploads, or cache revalidation. It returns a normalized payload preview and, when an existing CMS table can be read, a read-only collision/conflict preflight; it never claims image uploads are verified, and reports whether R2 is configured. Requests require a dedicated bearer secret. Notion requests use API version `2026-03-11`; the connection should receive only read-content and update-content capabilities and be shared with only the existing editorial data source. No code path searches, creates, renames, or reconfigures Notion properties.

Magazine entries require a `Magazine Subtype` property/value of `Special Episode` or `Magazine Episode`, matching the existing CMS taxonomy. `MOTHERLand` maps to RADARSite `Press` with `projectSection: Motherland`; `Press` and `Spotlight` map directly. New article and Magazine slugs can render on demand after cache invalidation, while unknown slugs still use the route's `notFound()` behavior.

## Required Notion schema

The handler fetches the existing data-source schema on each request and refuses to publish when a required name or type does not match. It does not create missing fields or options.

| Existing Notion property | Required type | Required values or behavior |
|---|---|---|
| `Article Title` | title | Non-empty article title |
| `Status` | status or select | Must define `Idea`, `Draft`, `In Review`, `Approved`, `Publishing`, `Published`, `Changes Requested`, and `Archived` |
| `Content Type` | select or status | Must define `Press`, `Spotlight`, `Magazine`, and `MOTHERLand` |
| `Article Body` | rich text | Non-empty source property; page blocks must also contain supported content |
| `Publish to RADARSite` | checkbox | Must be checked |
| `Author` | rich text, title, or people | Optional value; defaults to the RADARCharts by REM editorial label |
| `Excerpt` | rich text or title | Used when present; otherwise safely derived from body text |
| `Featured Image URL` | URL or rich text | Empty means preserve an existing featured image |
| `SEO Title` | rich text or title | Optional; falls back to the article title |
| `SEO Meta Description` | rich text or title | Optional; falls back to the excerpt |
| `Tags` | multi-select or rich text | Normalized to the CMS tag list |
| `Featured` | checkbox | Maps to CMS featured flag |
| `Scheduled Publish Date` | date | Must exist; future dates are rejected because scheduling is manual |
| `Editorial Notes` | rich text or title | Validated as an existing field; not overwritten by the integration |
| `Sync Status` | select, status, or rich text | Select/status must define `Syncing`, `Synced`, `Failed`, and `Conflict` |
| `RADARSite CMS ID` | rich text | Written after a successful upsert |
| `Notion Page ID` | rich text | Set to the normalized source page UUID on successful writeback |
| `Canonical Article URL` | URL or rich text | If set, must be HTTPS on `radarcharts.net` or `www.radarcharts.net`; otherwise generated from the existing route helper |
| `Last Synced At` | date or rich text | Updated on success |

All listed properties are required schema columns; individual author, excerpt, image, SEO, tags, and featured values may be empty where the fallback behavior above permits. If `Content Type = Magazine`, the page must also expose `Magazine Subtype` with a supported CMS value. Confirm these names and exact types against the real database before enabling the feature.

## Configuration owner checklist

A workspace/project owner must supply these values through Vercel's environment-variable settings or a local secret store. Do not commit the values or place them in `NEXT_PUBLIC_*` variables.

1. `NOTION_API_KEY`: internal Notion connection secret, granted read-content and update-content capabilities and shared with the **existing** editorial data source only.
2. `RADAR_NOTION_DATA_SOURCE_ID`: the verified ID copied from the existing data source settings. The current supplied ID is not accessible to the connected Notion account and must be checked by its owner.
3. `RADAR_NOTION_SYNC_SECRET`: a new, high-entropy bearer secret configured identically in the Notion automation/webhook caller and RADARSite.
4. `RADAR_NOTION_PUBLISHING_ENABLED`: keep `false` by default. Enable in **Preview only** after the first three values and the actual schema have been verified. Production should remain disabled until preview approval and operational validation.
5. Preview media setup: image imports use the existing R2 upload helpers. The Vercel project currently has R2 access credentials in Production, but the audit did not find those credentials in Preview. If preview test pages contain images, the owner must provide the existing R2 settings to Preview through Vercel's protected environment-variable controls. No secret was copied or revealed during this task.

Do not set `RADAR_NOTION_PUBLISHING_ENABLED=true` in Production as part of this implementation. The current task had no working Notion token, verified database access, or sync secret, so live publishing and end-to-end Notion validation remain blocked pending the owner inputs above.

## Test and rollout order

1. Confirm the exact data-source ID, property names/types, status options, and the Magazine subtype field with the database owner. Share that existing source with the new Notion connection; do not duplicate it.
2. Configure the token, data-source ID, webhook secret, and any required Preview R2 settings in Vercel Preview. Keep the feature switch disabled until the secrets are stored.
3. Enable the switch in Preview and use a dedicated approved test article. First call the endpoint with `dryRun: true`; then test image-free publishing, R2-backed images, same-page retry, Notion edits requiring reapproval, CMS-edit conflicts, slug collisions, and scheduled-date rejection.
4. Verify generated article/metadata, canonical URL, cache revalidation, CMS ID writeback, sync status, and old-route/new-slug behavior. Confirm an unknown slug still returns a real 404.
5. Production activation and any broader Notion automation should be a separate owner decision after preview results are reviewed. This code change does not activate either.

## Verification evidence and rollback

Executed locally on the feature branch:

- `npm run notion:contract-test` — PASS: schema, status/approval gates, content validation, type mapping, typed page-property updates, safe nested block rendering, CMS conflict detection, deterministic IDs, checksum-based media identity, auth and payload limits, a mocked dry-run, and mocked end-to-end publication/recovery. The route contracts cover idempotent retry, CAS retry, approval revocation during image import, block edits despite a stale timestamp, Notion finalization failure, media-association failure, and cache-revalidation failure. All Notion, CMS, R2, and cache interactions use in-memory mocks; the suite contacted no live services and changed no production data.
- `npx tsc --noEmit` — PASS.
- `npm run lint` — PASS (exit 0); reports six warnings in pre-existing, untouched UI files. `npx eslint` on every changed code file — PASS with no warnings.
- Existing suites — PASS: `npm run cms:taxonomy-contract-test`, `npm run cms:workflow-contract-test`, `npm run cms:studio-library-mock-test`, `npm run media-relationships:contract-test`, `npm run media:contract-test`, `npm run media-health:contract-test`, `npm run postgres:adapter-contract-test`, `npm run test:editorial-archives`, and `npm run test:csp`.
- `npm run build` — PASS; Next.js type checking, static generation (498 pages), and route compilation completed, including `/api/integrations/notion/publish`.
- Dependency setup caveat: a plain `npm ci` was rejected because this ARM64 sandbox encountered the repository’s pinned x64 Sharp binary. `npm ci --no-audit --no-fund --force` installed the locked tree and native Sharp 0.35.5 loaded successfully on ARM64 for checks/build; no dependency manifest or lockfile was altered for that workaround.

These are code/fixture checks, not live integration tests. The referenced Notion editorial database, Notion token, webhook secret, and local Neon/R2 credentials were not accessible; do not infer that the real Notion schema, live dry-run, R2 upload, CMS writeback, media-association lifecycle, or cache invalidation has succeeded. Although a Preview `DATABASE_URL` exists in Vercel, its target was not verified as isolated, so no Notion-triggered CMS write was attempted. A real Preview dry-run/publishing lifecycle remains blocked until an owner grants the Notion connection access, supplies the missing secrets, verifies an isolated test database or explicitly confirms the safe test scope, and validates the actual data-source schema.

Rollback is deliberately simple: keep `RADAR_NOTION_PUBLISHING_ENABLED=false` (the code default) to make the endpoint non-publishing. If this feature is already merged, set the switch to `false` in the existing project, then revert the integration commit through a review PR; leave existing CMS content and R2 objects untouched. No database migration is required by this implementation. Do not remove project-wide R2 credentials or edit any unrelated variables as rollback actions.

## Official Notion API references

- [Retrieve a page](https://developers.notion.com/reference/retrieve-a-page) — page properties, parent data source, and access behavior.
- [Retrieve block children](https://developers.notion.com/reference/get-block-children) — paginated children endpoint and recursive retrieval requirement.
- [Working with page content](https://developers.notion.com/guides/data-apis/working-with-page-content) — page block model, rich text, and nested content.
- [Update a page](https://developers.notion.com/reference/patch-page) — property writes must match the existing data-source schema.
- [Retrieve a data source](https://developers.notion.com/reference/retrieve-a-data-source) — schema retrieval for the existing source.
- [Authentication](https://developers.notion.com/reference/authentication) — bearer-token authentication.

## Initial baseline evidence

- Git baseline: `5f80c0da1f7336894168b8d404bc03a6b859cc39`; clean working tree; no existing PR for this integration.
- Main branch protection endpoint returned `404` (“Branch not protected”). Existing project convention is feature branch + review PR; use that rather than pushing to `main`.
- Vercel project Git association: `remRADAR/RADARSite`; production domain `radarcharts.net` verified; current `main` deployment READY.
- Connected Notion workspace search finds an unrelated `RADARCharts` profile page, but not the supplied editorial source/plan; direct reads of the supplied IDs are inaccessible.
- No source secrets or editorial content were printed into this document. The implementation remains off unless the feature flag is explicitly set.
