# RADARSite Supabase PostgreSQL Proof of Concept

**Date:** 2026-09-29  
**Project:** `radarsite-supabase-poc`  
**Supabase project ref:** `eoydzywyacoesnowdlge`  
**Organization:** `ehauhmwmklzfwfjstido`  
**Region:** `eu-west-1`  
**Status:** `ACTIVE_HEALTHY`  
**Cost confirmation:** $0/month  
**Production cutover:** **Not performed**

## Executive result

The isolated Supabase PostgreSQL POC is technically viable for the current RADARSite schema and data shape. PostgreSQL JSONB, foreign keys, indexes, uniqueness constraints, relationship ordering, deterministic IDs, and cascade behavior all worked in the separate POC project.

The POC is **not production-ready** because the three public tables currently have **Row Level Security disabled**. Supabase explicitly reports that these tables would be exposed to the `anon` and `authenticated` roles through Supabase client libraries. This was left unchanged intentionally: enabling RLS without approved policies could block legitimate access, and no production database or application was connected to this POC.

**POC decision: CONDITIONAL PASS.** Proceed to a separate security-policy and application-adapter POC before considering any production migration. Do not change Production `DATABASE_URL` or Neon.

## Safety boundary observed

The following were not changed:

- Production `DATABASE_URL`.
- Neon project, branch, quota, archive state, schema, or data.
- Production Vercel environment variables or live application routing.
- Production R2 objects, buckets, keys, or media relationships.
- WordPress content or media.
- Production editorial HTML.
- Production CMS content or media data.

Only the newly created Supabase POC project was created and populated.

## A. Exact schema created

The POC contains these application tables:

1. `public.studio_content`
   - `id integer PRIMARY KEY`
   - `content jsonb NOT NULL`
   - `updated_at timestamptz NOT NULL DEFAULT now()`

2. `public.content_media`
   - `id text PRIMARY KEY`
   - `content_id text`
   - `source_provider text`
   - `source_url text`
   - `source_id text`
   - `original_filename text`
   - `mime_type text`
   - `file_size bigint`
   - `width integer`
   - `height integer`
   - `storage_provider text NOT NULL`
   - `storage_bucket text NOT NULL`
   - `storage_key text NOT NULL UNIQUE`
   - `delivery_url text`
   - `checksum text`
   - `migration_status text NOT NULL`
   - `provenance jsonb NOT NULL DEFAULT '{}'::jsonb`
   - `created_at timestamptz NOT NULL DEFAULT now()`
   - `updated_at timestamptz NOT NULL DEFAULT now()`

3. `public.content_media_relationships`
   - `id text PRIMARY KEY`
   - `media_id text NOT NULL REFERENCES content_media(id) ON DELETE CASCADE`
   - `content_key text NOT NULL`
   - `content_source_provider text`
   - `content_source_id text`
   - `role text NOT NULL CHECK (role IN ('featured', 'inline'))`
   - `placement_index integer`
   - `source_locator text`
   - `migration_run_id text NOT NULL`
   - `provenance jsonb NOT NULL DEFAULT '{}'::jsonb`
   - `created_at timestamptz NOT NULL DEFAULT now()`
   - `updated_at timestamptz NOT NULL DEFAULT now()`
   - placement check: featured rows require a null placement; inline rows require a non-negative placement

Indexes created:

- `content_media_pkey`
- `content_media_storage_key_key` — unique storage key
- `content_media_source_identity_idx` — `(source_provider, source_id)`
- `content_media_relationships_pkey`
- `content_media_relationships_identity_idx` — unique `(media_id, content_key, role, COALESCE(placement_index, -1))`
- `content_media_relationships_featured_idx` — one featured relationship per content key
- `content_media_relationships_content_idx` — `(content_key, role, placement_index)`
- `content_media_relationships_run_idx` — `(migration_run_id)`

The Supabase table inspection confirmed the columns, JSONB fields, primary keys, the media foreign key, and the role check constraint.

## B. Exact data loaded

The fixture was intentionally small and non-secret, derived from the committed RADARSite snapshot:

| Data | Loaded |
|---|---:|
| `studio_content` rows | 1 |
| Article records inside JSONB | 3 |
| Artist records inside JSONB | 1 |
| Release records inside JSONB | 1 |
| Media metadata rows | 2 |
| Relationship rows | 4 |
| R2 objects uploaded | 0 |
| WordPress media modified | 0 |
| Credentials copied | 0 |

The three representative articles were real legacy-source records with source IDs `4754`, `4752`, and `4747`. The POC retained identifiers, source URLs, slugs, titles, metadata, status, dates, featured-image URLs, body/bodyHtml shape, categories, and author fields. Body content was intentionally limited to representative snippets; no full production content dump was copied.

Media rows were metadata-only fixtures:

- `media:legacy:4420` — JPEG metadata, 1,200 × 800, 248,320 bytes, deterministic POC R2 key.
- `media:legacy:4757` — JPEG metadata, 1,600 × 1,067, 312,004 bytes, deterministic POC R2 key.

The delivery URLs used `example.invalid` intentionally. No R2 object was uploaded and no production URL was changed.

Relationship fixture:

- One media item shared by two articles.
- One featured-image relationship.
- Inline relationships with placements `0` and `1`.
- Ordered placements.
- Source locators.
- Deterministic relationship IDs.
- One migration-run owner: `supabase-poc-2026-09-29`.

## C. Application compatibility results

| Area | Result | Evidence |
|---|---|---|
| PostgreSQL schema | **PASS** | Supabase project is PostgreSQL 17 and migration applied successfully |
| JSONB content | **PASS** | `studio_content.content` accepted JSONB; 2,463-byte representative payload read back; 3 articles counted |
| Foreign key | **PASS** | `content_media_relationships.media_id` references `content_media.id` with `ON DELETE CASCADE` |
| Indexes | **PASS** | All required primary, unique, lookup, relationship, featured, and migration-run indexes present |
| Vercel-style HTTPS connectivity | **PASS, bounded** | Supabase REST endpoint returned HTTP 200 from the sandbox using a publishable key and `limit=1` |
| Existing RADARSite app against Supabase | **NOT YET RUN** | Production app was deliberately not connected; local environment has no POC database URL and no Supabase adapter |
| Existing Neon client unchanged | **PASS by preservation** | No application dependency or Production client was changed |
| Vercel deployment with POC credentials | **NOT RUN** | Would require a separate preview project/environment and an adapter or connection URL |
| Authentication/session behavior | **NOT RUN** | No live application or Studio session was connected to the POC |

The POC proves PostgreSQL/schema compatibility. It does not yet prove that the current `@neondatabase/serverless` client can connect directly to Supabase. That requires a separate adapter/connection test because the current code imports the Neon-specific client rather than a generic PostgreSQL client.

## D. Query and persistence tests

The following bounded SQL tests succeeded in the isolated POC:

- Insert/upsert of `studio_content` JSONB.
- JSONB article count and slug extraction.
- Insert/upsert of media metadata.
- Insert/upsert of relationship rows.
- Deterministic relationship IDs.
- Idempotent rerun: relationship total remained **4**, with **4 distinct IDs** after replaying an existing row.
- Cascade behavior: deleting a temporary media row removed its temporary relationship row; the transaction was rolled back.
- Ordered relationship query by content, role, and placement.
- Source provider/source ID metadata lookup.
- Storage key uniqueness enforcement via the unique index.

Repository checks also passed without contacting Neon:

- Relationship contract test: **PASS**.
- WordPress media contract test: **PASS**.
- Media-health contract test: **PASS**.
- Effective image URL test: **12 assertions passed**.
- ESLint: **PASS**.
- TypeScript: **PASS**.
- Snapshot-only Next production build: **PASS**.

The production build generated 384 static pages using `RADAR_SKIP_DATABASE=1`, confirming the application can build from the committed snapshot without Neon.

## E. Vercel/connectivity results

A bounded equivalent production-like HTTPS check was performed against the isolated Supabase REST endpoint:

- URL: isolated POC project REST endpoint.
- Query: selected only `id, updated_at` with `limit=1`.
- Result: HTTP `200`.
- Response: one row with the selected fields.

The live RADARSite Vercel application was **not** connected to Supabase. A true Vercel app-runtime test remains a next POC phase requiring:

1. A provider-neutral database adapter or generic PostgreSQL client.
2. A separate Vercel preview project/environment.
3. The POC connection variables only in that preview.
4. Route and Studio checks against the preview.

## F. `studio_content` JSONB compatibility

**PASS for the representative fixture.**

- Column accepted JSONB.
- Representative payload size: **2,463 bytes** as measured by `pg_column_size(content)`.
- JSONB array extraction worked: `3` articles and `1` artist.
- Slug extraction worked through `content->'articles'->0->>'slug'`.
- The application’s current committed full snapshot is approximately **3,591,223 bytes raw**. A full copy remains far below the Supabase 500 MB Free database allowance, but actual PostgreSQL storage must include TOAST, row headers, indexes, future media metadata, relationship rows, and growth.

## G. `content_media` compatibility

**PASS for metadata and indexing.**

- Two metadata-only rows inserted.
- JSONB provenance accepted.
- `bigint` file sizes and integer dimensions persisted correctly.
- Source provider/source ID fields were queryable.
- Storage key uniqueness index exists.
- No actual R2 upload or object mutation occurred.

## H. `content_media_relationships` compatibility

**PASS for the tested relationship model.**

Verified cases:

- One media item used by multiple articles.
- Featured-image relationship.
- Inline-image relationship.
- Multiple inline placements.
- Ordered placements.
- Source locators.
- Deterministic IDs.
- Identity uniqueness index.
- Featured uniqueness index.
- Role and placement check constraint.
- Foreign-key cascade behavior.
- Migration-run ownership field.
- Idempotent replay.

## I. Size and free-tier headroom

Measured POC sizes:

| Measurement | Bytes | Approximate size |
|---|---:|---:|
| Entire Supabase database (`pg_database_size`) | 11,095,187 | 10.58 MiB |
| `studio_content` total relation size | 49,152 | 48 KiB |
| `content_media` total relation size | 65,536 | 64 KiB |
| `content_media_relationships` total relation size | 98,304 | 96 KiB |
| Application tables plus indexes | 212,992 | 208 KiB |
| Representative JSONB payload | 2,463 | 2.4 KiB |
| Full committed snapshot JSON | 3,591,223 | 3.43 MiB |

The 11.1 MB database measurement includes PostgreSQL/Supabase database overhead and is not a direct estimate of a full production clone. The application relations plus indexes occupy about 208 KiB for this small fixture.

At the current snapshot size, a full `studio_content` copy would consume roughly **0.7% of 500 MB before PostgreSQL overhead**. A conservative operational estimate of 20 MB for the full content snapshot, metadata, relationships, TOAST, indexes, and initial growth would still be about **4%** of the Free database allowance. This is comfortable for current content volume, but not a long-term guarantee: large HTML bodies, revisions, migration history, additional media metadata, logs, and growth must be measured over time.

**Conclusion:** the current RADARSite dataset fits comfortably in Supabase Free by storage size. The important remaining Free-plan risks are inactivity pausing, 5 GB egress, no included automatic backups, connection behavior, and security policy configuration—not immediate database capacity.

## J. Code changes required for Supabase

No production code changes were made for this POC.

A future isolated preview would require the minimum likely changes:

1. Introduce a provider-neutral database adapter.
2. Add a generic PostgreSQL client or Supabase-compatible serverless connection method; do not use the Neon-specific client against Supabase without a dedicated compatibility test.
3. Add POC-only environment variables to a separate Vercel preview project.
4. Keep the existing SQL, JSONB model, relationship model, and snapshot fallback initially.
5. Add a migration/export command that can reproduce the POC schema and representative fixture.
6. Add connection/health diagnostics and a database-size budget check.

No `DATABASE_URL` in Production should be changed during this work.

## Security finding: RLS is disabled

Supabase inspection reported `rls_enabled: false` for:

- `public.studio_content`
- `public.content_media`
- `public.content_media_relationships`

Supabase’s advisory states that these tables are fully exposed to `anon` and `authenticated` roles through Supabase client libraries. The bounded REST test returned HTTP 200, confirming the POC data is reachable through the public API surface.

This is acceptable only as an isolated temporary POC state. Before any preview or production use:

- Enable RLS on all three tables.
- Define explicit policies for public read, authenticated Studio read/write, and service-role migration operations.
- Verify that the public anon role cannot write or read protected metadata.
- Test policies with anon, authenticated, and service-role credentials.

The remediation SQL was intentionally **not** auto-applied because enabling RLS without policies could block access and because policy semantics require an explicit design decision.

## K. Remaining operational risks

1. **Free-project pausing:** Supabase Free projects can pause after low activity. Public snapshot fallback reduces public-page impact, but Studio writes would be unavailable while paused.
2. **Backups:** Supabase Free does not include automatic daily backups. A separate logical export to durable storage is required.
3. **Egress:** 5 GB monthly egress can become material when full article HTML and media-adjacent payloads are served through the database.
4. **Connection behavior:** the current Neon-specific client must be replaced or proven compatible through a generic PostgreSQL adapter.
5. **RLS:** currently disabled in the POC; this is a hard blocker before any shared environment use.
6. **Secrets:** the POC must use separate credentials; no production credentials were copied.
7. **R2 independence:** media objects remain in R2 and are not included in database backups; database rollback alone does not restore deleted R2 objects.
8. **Database size monitoring:** PostgreSQL storage must include TOAST, indexes, future relationship rows, and growth, not just raw JSON size.

## L. Proposed future production migration sequence

1. Keep Neon untouched and create an independent logical export plan.
2. Implement the provider-neutral PostgreSQL adapter behind a feature flag.
3. Enable and test RLS policies in the POC.
4. Create a separate Vercel preview project using only Supabase POC credentials.
5. Load a representative non-secret dataset and run public route, metadata, Studio read/write, cache invalidation, and fallback tests.
6. Add daily logical exports and restore drills before any production consideration.
7. Compare POC data against a read-only Neon export; do not dual-write yet.
8. Run load/connection/egress tests and monitor size headroom.
9. Request a separate explicit production-cutover approval.
10. Take a final Neon backup/export, stage the Supabase production schema, copy data, verify counts/checksums/relationships, and only then change a controlled deployment environment.
11. Observe the new provider while Neon remains recoverable and undeleted.

## M. Rollback strategy

- Leave Neon and its data unchanged until the replacement has passed the observation window.
- Keep the existing Production Vercel deployment and environment variables available.
- Roll back by restoring the previous Vercel environment to Neon and redeploying the known-good application.
- Preserve Supabase for comparison; do not delete it during rollback.
- Restore content from the Neon logical export if required.
- Treat R2 objects independently: do not delete or rewrite R2 keys as part of a database rollback.
- Keep migration-run IDs and relationship provenance so any future copy can be audited and reversed.

## N. GO / NO-GO criteria for future production cutover

### GO only if all are true

- RLS policies are implemented and tested for anon/authenticated/service-role access.
- A generic PostgreSQL adapter passes the existing application query and persistence tests.
- A separate Vercel preview serves homepage, archive, article metadata, Studio read/write, and cache invalidation successfully.
- The complete representative data round trip matches expected JSONB, media metadata, and relationship counts.
- Full content estimate remains comfortably below 500 MB with documented growth headroom.
- Daily logical backups and a restore drill are proven.
- Supabase pause, connection, egress, and error behavior have an operational runbook.
- Neon export and rollback are verified.
- R2 objects and media URLs remain unchanged.
- A separate explicit production-cutover approval is granted.

### NO-GO if any are true

- RLS remains disabled.
- Only the public REST check passes but the application adapter is untested.
- A Vercel preview cannot connect reliably.
- Backup/restore is not proven.
- Content or relationship counts differ.
- Egress or storage headroom is unclear.
- The cutover would require deleting, unarchiving, or mutating Neon data.
- Production R2 or WordPress changes are required to make the database POC work.

## Final POC status

**CONDITIONAL PASS for isolated PostgreSQL compatibility.**  
**NO-GO for production migration at this stage.**

The next safe action is not a production cutover. It is a separate security-policy and provider-adapter preview using only the new Supabase project.

## References

- [Supabase Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supabase backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase pricing](https://supabase.com/pricing)
- [Supabase billing and quotas](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
