# Production Relationship Schema Application Blocked

**Date:** 2026-09-29  
**Approved action:** Apply the reviewed relationship schema only  
**Result:** Not executed

## Observed Neon state

The authenticated Neon console opened the RADARSite production project `radarcharts-studio`, production branch `br-snowy-block-aehpm8ym`, database `neondb`, and displayed:

> Limit reached — You've used all of your monthly network transfer allowance for this project.

The SQL editor also identified the production branch as archived and stated that querying it would unarchive the branch.

## Safety decision

The schema-only DDL was **not** executed. The branch was not unarchived. No Neon compute was started, no tables or indexes were created, and no application/content/media records were changed.

This is consistent with the approved boundary: if Neon is full and cannot be safely used, stop rather than add load or alter the branch state.

## Application impact

The current application is coupled to Neon through `DATABASE_URL` and the `@neondatabase/serverless` client. The relationship-model implementation remains present in the repository, but its `ensureMediaRelationshipsTable()` helper has not been called against production.

The production relationship model therefore remains **code-verified but database-unapplied**.

## DDL that remains unapplied

The reviewed implementation would create:

```text
content_media_relationships
- id text primary key
- media_id text not null references content_media(id) on delete cascade
- content_key text not null
- content_source_provider text
- content_source_id text
- role text not null check (featured | inline)
- placement_index integer
- source_locator text
- migration_run_id text not null
- provenance jsonb not null default '{}'
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()
```

It would also create the deterministic relationship identity index and one-featured-placement-per-content index.

## No changes made

- No Neon branch unarchive.
- No DDL execution.
- No production `content_media` rows.
- No relationship rows.
- No R2 uploads or deletes.
- No WordPress reads beyond the prior read-only audit.
- No editorial HTML or featured-image rewrites.

## Platform recommendation

Do not switch storage/database platforms implicitly. A replacement must preserve the existing Postgres schema, `DATABASE_URL` contract, transactional behavior, and serverless connection model, or be treated as a separate migration project.

Potential alternatives can be evaluated separately, but this task stops at the Neon quota gate. The next safe options are:

1. Resolve the Neon quota/archive state and apply the already-reviewed DDL there; or
2. Approve a separate platform evaluation and migration plan before changing `DATABASE_URL` or application persistence.
