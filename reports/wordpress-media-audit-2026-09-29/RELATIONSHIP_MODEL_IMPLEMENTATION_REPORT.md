# RADARSite Media Relationship Model Implementation

**Date:** 2026-09-29  
**Scope:** Approved relationship-model implementation only  
**Migration status:** No staged media migration executed

## Implemented

Added `src/lib/media-relationships.ts` with:

- `featured` and `inline` placement roles;
- required migration-run ownership;
- deterministic relationship IDs derived from media identity, content key, role, and placement index;
- validation that featured placements have no index;
- validation that inline placements have a non-negative integer index;
- validation that relationship IDs cannot be manually substituted;
- stable uniqueness-key generation.

Extended `src/lib/content-server.ts` with:

- `ensureMediaRelationshipsTable()`;
- `upsertMediaRelationship()`;
- `deleteMediaRelationship()`;
- `deleteMediaRelationshipsByRun()`;
- `listMediaRelationshipsByContent()`.

The table is created only when a relationship helper is called. This change does not connect to Neon during build/tests and does not automatically create the table in production.

## Database shape

```sql
content_media_relationships
- id text primary key
- media_id text not null references content_media(id) on delete cascade
- content_key text not null
- content_source_provider text
- content_source_id text
- role text not null check (role in ('featured', 'inline'))
- placement_index integer
- source_locator text
- migration_run_id text not null
- provenance jsonb not null default '{}'
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()
```

Indexes enforce:

- one deterministic relationship per `(media_id, content_key, role, placement_index)` with featured `NULL` normalized to `-1`;
- one featured relationship per `content_key`.

This represents one media item used by multiple articles, one featured image per article, multiple ordered inline placements, and source locators without rewriting editorial HTML.

## Verification

All completed successfully without production or database contact:

- `npm run media-relationships:contract-test`
- `npm run media:contract-test`
- `npm run media-health:contract-test`
- `npx tsx scripts/test-effective-image-url.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`

The focused contract test verified:

- deterministic IDs;
- featured-role validation;
- one shared asset across two articles;
- multiple ordered inline placements;
- invalid featured/inline placements rejected;
- manually supplied relationship IDs rejected;
- no database contact;
- no production mutations.

## Still not executed

- No R2 uploads.
- No WordPress media downloads.
- No `content_media` rows.
- No relationship rows.
- No editorial HTML rewrite.
- No featured-image URL rewrite.
- No production schema creation.
- No bulk or staged migration.

## Next gate

The relationship model is implemented and locally verified. A separate explicit approval is still required before applying the schema to a production database or running the five-fixture staged media ingestion. The staged run must use the exact batch and namespace described in `PHASE3_STAGED_MEDIA_PROPOSAL.md`.
