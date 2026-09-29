# RADARSite Zero-Budget Database Platform Evaluation

**Evaluation date:** 2026-09-29  
**Scope:** Recommendation and migration planning only. No production database, Neon branch, `DATABASE_URL`, schema, R2, media, or editorial data was changed.

## Executive recommendation

**Recommendation: keep the current Neon project unchanged while evaluating Supabase PostgreSQL as the primary replacement candidate, with Turso as the stronger zero-cost quota alternative only if RADARSite accepts a database-engine rewrite. Do not choose Cloudflare D1 for the current application shape.**

Supabase is the lowest-risk replacement because RADARSite already uses PostgreSQL semantics, `DATABASE_URL`, JSONB, timestamps, foreign keys, indexes, and the newly implemented `content_media_relationships` model. The free plan is not a perfect production guarantee: it is limited to 500 MB per project, 5 GB egress, has no included automatic backups, and can pause after seven days of low activity. It is nevertheless the only evaluated option that can preserve the database model with a relatively contained adapter and deployment change.

Turso is the most attractive **quota profile**: 5 GB storage, 500 million monthly row reads, 10 million monthly row writes, 100 databases, no credit card required, and a one-day point-in-time restore allowance on the free plan. However, Turso is SQLite/libSQL rather than PostgreSQL. It requires replacing the Neon client, translating JSONB and PostgreSQL DDL/query behavior, changing `DATABASE_URL` semantics, and validating the large `studio_content` JSON document and relationship constraints against SQLite/libSQL. Turso’s own documentation describes TursoDB Cloud as early preview, which raises availability and operational maturity risk for this project.

Cloudflare D1 is operationally attractive beside the existing Cloudflare R2 media layer, but it is the wrong primary datastore for this application without a substantial redesign. Free D1 has a 500 MB per-database limit, a 2 MB maximum row size, 5 million rows read per day, 100,000 rows written per day, 50 D1 queries per Worker invocation, and six simultaneous D1 connections per Worker invocation. RADARSite’s committed `merged-content.json` is 3,591,223 bytes raw, already larger than D1’s 2,000,000-byte row limit, while the current `studio_content` design stores the content as one JSONB row. D1 would therefore require content chunking or normalization before it could represent the current content model.

## RADARSite facts used in the comparison

The current audited snapshot contains **342 published snapshot articles**, **279 legacy WordPress articles**, approximately **1,500 unique snapshot media URLs**, and **898 unique legacy media URLs**. The committed `src/data/merged-content.json` is **3,591,223 bytes raw** and **651,410 bytes gzip-compressed**. The code currently allows a `studio_content` JSON payload up to 20 MiB, while production public reads use the committed snapshot/cache fallback when the database is unavailable.

The application currently uses `@neondatabase/serverless` and `DATABASE_URL`. The persistence model includes `studio_content`, `content_media`, and the code-only, locally verified `content_media_relationships` model. `content_media_relationships` uses foreign keys, uniqueness indexes, role checks, JSON provenance, and migration-run ownership.

## Factual comparison

| Criterion | Supabase PostgreSQL Free | Cloudflare D1 Free | Turso Free | RADARSite consequence |
|---|---|---|---|---|
| Database/storage | 500 MB database per project; 1 GB file storage | 500 MB per database and 5 GB total account storage; paid database maximum is 10 GB | 5 GB storage; up to 100 databases | Supabase may fit metadata but needs strict size monitoring; D1 has the 2 MB row blocker; Turso has comfortable headroom |
| Network/egress | 5 GB egress and 5 GB cached egress included | No D1 data-transfer/egress charge; Workers requests remain separately limited | Pricing page is quota-based around rows/storage/syncs; no separate egress charge was identified in the reviewed pricing page | D1/R2 pairing is strong for transfer economics; Supabase has a finite monthly egress allowance |
| Read/write/query limits | Pricing advertises unlimited API requests, but database size, connections, compute and egress remain bounded; no equivalent free monthly row quota was published in the reviewed pricing page | 5M rows read/day and 100K rows written/day on Workers Free; 50 D1 queries per Worker invocation; 100K Worker requests/day | 500M rows read/month, 10M rows written/month, 3 GB monthly sync allowance | Turso gives the largest explicit read budget; D1 can hard-stop daily; Supabase’s primary risk is pause/size/egress rather than row quotas |
| Compute/sleep | Free Nano shared compute; free projects pause after 7 days of low activity | Scale-to-zero; no capacity-hour charge; query work runs within Workers limits | Idle databases cost storage only according to pricing; no inactivity pause was identified in reviewed docs | Supabase has an explicit availability interruption; D1 and Turso are more suitable for sporadic traffic |
| Database size limit | 500 MB on Free | 500 MB free per database; 10 GB maximum per database on paid | 5 GB free storage | The 3.59 MB snapshot is not a storage issue for any option, but it is a D1 row-size issue |
| Backup/restore | No automatic backups on Free; free users are advised to run `supabase db dump`; daily backups are Pro/Team/Enterprise. PITR is paid | Free Time Travel retention is 7 days; paid is 30 days; 10 restores per 10 minutes per database | Free point-in-time restore is 1 day; paid plans increase retention | Supabase Free requires an external backup job; D1/Turso include limited recovery primitives |
| Connection limits | Nano: 60 database connections and 200 pooler clients | Up to six simultaneous D1 connections per Worker invocation | Reviewed official sources did not publish a Postgres-style max-connections number; the remote libSQL client is the intended model | Supabase is easiest for the current serverless connection pattern; D1/Turso require client-specific load tests |
| Availability characteristics | Dedicated Postgres instance, but Free projects can be paused after low activity for 7 days and restored for up to one year | Globally managed serverless database, scale-to-zero, single-threaded per database; overloaded queues return errors | Fully managed libSQL/SQLite service, but official docs label TursoDB Cloud early preview | Supabase is structurally familiar but not always-on on Free; D1/Turso trade idle cost for queue/engine constraints |
| Credit card | Official reviewed docs state paid plans require a card; the reviewed Free-plan docs did not explicitly establish whether signup always requires one | The reviewed D1/Workers docs did not state a card requirement; verify during a separate proof of concept | Pricing explicitly says “no credit card required” | Turso is the clearest no-card option; verify Supabase/Cloudflare account onboarding before selection |
| Exceeding free allowance | Egress/storage/usage are plan quotas; Free has no overage billing path in the reviewed material. Projects can pause for inactivity; size/usage must be reduced or plan upgraded | Daily read/write queries fail with quota errors. At storage limit, inserts, table/index/trigger changes fail until data is cleaned or the plan is upgraded | Queries exceeding quota return `BLOCKED`; paid plans charge overage once billing is enabled | All three can interrupt writes; D1/Turso fail explicitly, while Supabase combines quota and pause risks |
| Suspend/throttle/archive behavior | Free projects pause after low activity; paused projects are restorable for one year | Daily quota exhaustion blocks operations; overloaded databases return errors; scale-to-zero adds cold-start behavior | Quota-exceeding queries block; no inactivity pause was identified in reviewed official sources | Neon’s archived/transfer-limit failure mode is not unique in principle; every free option needs monitoring and backups |
| Hard monthly limits like the current Neon incident | Supabase has finite egress, database size, storage, and project limits; not the same daily row-stop model | Yes: daily rows-read/rows-written and storage limits are enforced on Free | Yes: monthly rows-read/rows-written/storage/sync quotas; over-limit queries block | A provider change does not eliminate quota risk; it changes the failure mode |
| PostgreSQL compatibility | Native PostgreSQL | SQLite/D1 SQL, not PostgreSQL | SQLite/libSQL, not PostgreSQL | Supabase wins migration compatibility by a wide margin |
| Migration complexity | Low-to-medium: dump/restore, schema migration, connection/client changes, RLS/security review | High: schema and query rewrite, split `studio_content`, Worker binding/API architecture | High: SQLite/libSQL schema/query/client rewrite; JSONB and PostgreSQL behavior review | Supabase is the only sensible first POC if preserving product behavior is the priority |
| Expected application changes | Replace Neon client/connection URL; verify PostgreSQL extensions and auth; migrate schema/data; update operational docs | Replace database client with D1 binding or a Cloudflare Worker API; normalize/chunk content; rewrite SQL and migrations | Replace Neon client with `@libsql/client`; translate SQL/types; rewrite migrations and deployment env; validate concurrency | Supabase preserves the current data model; D1/Turso are architectural migrations |
| Neon serverless client | No; use Supabase PostgreSQL connection/pooler or Supabase client | No | No | Existing `@neondatabase/serverless` cannot be retained as the production adapter |
| `DATABASE_URL` | Compatible in principle as a PostgreSQL connection string, but new credential/SSL/pooler URL required | Not compatible as a direct PostgreSQL URL; use Worker binding or HTTP/API boundary | Not compatible as a PostgreSQL URL; use libSQL URL/token variables | Supabase minimizes environment-variable and runtime changes |
| Current schema and relationship model | Compatible: JSONB, foreign keys, indexes, checks, timestamps, and relationship table map naturally | Not compatible as-is: JSONB and PostgreSQL DDL/query assumptions need translation; 2 MB row limit blocks current single-row snapshot | Mostly expressible, but SQLite type/constraint/JSON behavior must be tested; `studio_content` should likely be normalized or chunked | Relationship model is portable conceptually, not implementation-identical |
| Vercel | Strong fit; serverless Postgres connection/pooler pattern is common | Not direct; requires Cloudflare Worker/API or another HTTP boundary, adding latency and deployment complexity | Strong fit through `@libsql/client` and environment URL/token, as shown in Turso’s Next.js guide | Supabase and Turso fit Vercel better than D1 |
| Existing Cloudflare R2 | Compatible; keep R2 as independent media storage | Strongest same-vendor integration, but D1 is still the wrong content database without redesign | Compatible; R2 remains an independent S3-compatible media layer | R2 does not require the database provider to be Cloudflare |
| Vendor lock-in | PostgreSQL is portable; Supabase-specific Auth/Storage/Realtime features add optional lock-in | Cloudflare Workers/D1 bindings and SQLite format create platform coupling | libSQL/Turso APIs, sync, and branching create engine/service coupling | Supabase has the best escape path if RADARSite keeps plain PostgreSQL |
| Realistic suitability at current scale | **Best first candidate**, subject to Free pause, 500 MB, 5 GB egress and external backups | **Not suitable without a major content/storage redesign** | **Potentially suitable for zero-budget traffic**, but only after a deliberate engine rewrite and early-preview risk acceptance | Choose based on risk tolerance, not headline free-tier size |

## Recommendation by objective

### If the priority is preserving RADARSite behavior

Use a separate Supabase Free project as the proof-of-concept replacement. Keep plain PostgreSQL tables and SQL, do not adopt Supabase-specific features, preserve the existing `content_media` and relationship model, and keep R2 independent. Use the Supabase pooler/appropriate serverless connection mode rather than direct connections from every Vercel invocation. Add an external scheduled logical dump because automatic Free backups are not included.

This option does not guarantee always-on production availability. The application already has a committed snapshot fallback, which reduces public-page risk if the database is paused or temporarily unavailable, but Studio publishing would be unavailable until the project resumes. The POC must explicitly test the pause/restore workflow and document the operational response.

### If the priority is the largest zero-cost quota

Evaluate Turso in a separate project. Its free quotas are materially larger for this workload, it explicitly requires no credit card, and its quota failure is an explicit `BLOCKED` response rather than silent overage. However, it requires a replacement persistence layer, SQLite/libSQL semantics, and a migration of the JSON/content model. Turso’s official platform documentation currently describes TursoDB Cloud as early preview, so it is not automatically a safer production choice despite better quotas.

### Why not D1

D1 is attractive for R2 adjacency and no-egress pricing, but the current architecture is a PostgreSQL application with a 3.59 MB JSON snapshot and a 20 MiB content-payload allowance. D1’s 2 MB maximum row size directly conflicts with the current one-row `studio_content` design. D1 would require a content normalization/chunking redesign plus a Cloudflare Worker API boundary for Vercel. It also enforces daily query failures after 5M reads or 100K writes on Free. That is too much application and deployment change for the immediate problem.

## Migration-risk assessment

| Risk | Supabase | D1 | Turso | Mitigation |
|---|---|---|---|---|
| Data-model incompatibility | Low | High | High | POC schema/data round trip before any production change |
| Runtime client change | Medium | High | High | Keep an adapter interface and test production-like Vercel functions |
| Free-tier interruption | Medium: inactivity pause | High: daily hard-stop and overload errors | Medium: monthly `BLOCKED` quotas; early preview | Monitoring, snapshot fallback, backups, rate budgets, runbooks |
| Backup weakness | High on Free | Medium: 7-day Time Travel | Medium: 1-day PITR | Independent daily logical exports to durable storage |
| Media relationship integrity | Low if PostgreSQL | High | Medium-high | Contract-test featured/shared/inline identities and rollback |
| Vercel deployment complexity | Low | High | Medium | Deploy a separate preview project and compare route behavior |
| Rollback complexity | Low-medium | High | High | Dual-read or export/import rehearsal before cutover |
| Vendor lock-in | Low if plain SQL | High | Medium-high | Keep repository-level repository interface and portable schema docs |

## Proposed safe migration sequence

1. **Freeze production.** Keep Neon, `DATABASE_URL`, R2, schema, media, and editorial content unchanged. Do not unarchive Neon.
2. **Create a separate free POC project.** First choice: Supabase Free. Alternative branch of work: Turso Free. Do not use the production project or production credentials.
3. **Create a schema-only test database.** Apply `studio_content`, `content_media`, and `content_media_relationships` to the POC only. Do not upload WordPress media.
4. **Export a minimal synthetic fixture.** Use one small content record, one featured image metadata record, one shared media record referenced by two articles, and two inline placements. Validate deterministic IDs, indexes, foreign keys, and rollback.
5. **Rehearse the content round trip.** Export/import a representative snapshot subset and compare normalized JSON, titles, statuses, source IDs, checksums, and relationship rows.
6. **Build a provider adapter.** Keep the current Neon adapter available. Add the candidate adapter behind a configuration flag, never by editing Production `DATABASE_URL` first.
7. **Deploy a separate Vercel preview project.** Use only POC credentials and no production R2 mutation. Test homepage, archive, article metadata, Studio read, Studio write, cache invalidation, and database-unreachable fallback.
8. **Run quota and failure tests.** Simulate rate limits, database errors, stale cache, provider downtime, connection exhaustion, and backup restore. Record whether the app remains publicly readable from the snapshot.
9. **Run a dual-export comparison.** Compare POC data against a read-only Neon export while Neon remains untouched. Do not perform a live dual-write until the provider and rollback plan are separately approved.
10. **Return for a separate cutover approval.** Only after the POC passes should a future prompt authorize a production backup, schema application, data copy, environment change, and controlled cutover.

## Rollback plan

Before any future cutover, take a verified logical export of Neon and preserve the existing R2 objects. Keep the Neon project and credentials unchanged until the replacement has served the same routes successfully for an agreed observation window. If the replacement fails, revert Vercel environment variables to Neon, redeploy the last known-good application, disable the replacement adapter, and preserve the replacement database for forensic comparison. Never delete Neon data as part of rollback.

For Supabase, rollback is a PostgreSQL export/import or connection revert. For Turso, rollback requires retaining an authoritative PostgreSQL export because the schema and type semantics are not identical. For D1, rollback requires preserving the normalized/chunked representation and the original PostgreSQL export; it is the most complex of the three.

## Required application changes

### Supabase path

- Replace `@neondatabase/serverless` with a PostgreSQL-compatible serverless client or Supabase’s database connection method.
- Add a provider-neutral database adapter so Neon remains selectable during POC.
- Add a new POC connection variable; do not overwrite Production `DATABASE_URL` yet.
- Apply the existing PostgreSQL schema in the POC, including `content_media_relationships`.
- Add a logical backup/export job because Free has no included automatic backups.
- Add provider health, quota, pause, and connection diagnostics.
- Validate RLS/security settings only if Supabase APIs are adopted; plain database access can remain SQL-based.

### Turso path

- Replace Neon with `@libsql/client` and URL/token environment variables.
- Translate PostgreSQL DDL, JSONB, timestamp, cast, and query syntax.
- Decide whether to retain the 3.59 MB content snapshot as one SQLite value or normalize/chunk it.
- Reimplement transaction, connection, and migration behavior for libSQL.
- Add provider-specific backup/export and quota monitoring.

### D1 path

- Add a Cloudflare Worker/API boundary or move server-side database calls to a Cloudflare runtime.
- Replace PostgreSQL/Neon SQL with D1 SQLite APIs.
- Split the current `studio_content` blob because the current raw snapshot exceeds D1’s 2 MB row maximum.
- Redesign migrations into bounded batches.
- Add daily rows-read/rows-written budgets and alarms.
- Validate six-connection-per-invocation and 50-query-per-invocation limits.

## Things that must not change yet

- Do not migrate production data.
- Do not change Production `DATABASE_URL`.
- Do not unarchive or modify Neon.
- Do not apply `content_media_relationships` to Production.
- Do not rewrite `studio_content`, `content_media`, editorial HTML, or media relationships.
- Do not upload or migrate WordPress media.
- Do not change R2 configuration or object keys.
- Do not promote a POC database to Production.
- Do not adopt provider-specific Auth, Storage, Realtime, sync, or edge features before the database decision.

## Proof-of-concept acceptance criteria

A candidate is not ready for production consideration until it can:

1. Store and round-trip a representative content subset without semantic changes.
2. Preserve the featured/shared/inline relationship contract and deterministic IDs.
3. Support the current public cache and snapshot fallback behavior.
4. Serve the homepage, archive, and three representative article pages through a separate Vercel preview.
5. Execute a Studio read and write against POC data only.
6. Survive provider-unavailable and quota-exceeded simulations without public-page corruption.
7. Produce and restore a verified backup/export.
8. Demonstrate a documented rollback to the unchanged Neon deployment.
9. Confirm R2 remains independent and no media objects are modified.
10. Pass lint, TypeScript, build, image, media, and relationship contract tests.

## Sources

- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase billing and quotas](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase compute, disk, and connection limits](https://supabase.com/docs/guides/platform/compute-and-disk)
- [Supabase Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supabase backups](https://supabase.com/docs/guides/platform/backups)
- [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
- [Cloudflare D1 FAQ](https://developers.cloudflare.com/d1/reference/faq/)
- [Cloudflare Workers pricing and free limits](https://developers.cloudflare.com/workers/platform/pricing/)
- [Turso pricing](https://turso.tech/pricing)
- [Turso usage and billing](https://docs.turso.tech/help/usage-and-billing)
- [Turso Cloud](https://docs.turso.tech/turso-cloud)
- [Turso Next.js guide](https://docs.turso.tech/sdk/ts/guides/nextjs)
