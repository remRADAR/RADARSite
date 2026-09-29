# RADARSite Cross-Account Manus Continuity Clause

**Purpose:** Allow another Manus account, Manus project, or development agent to continue RADARSite without losing the current technical state, repeating unsafe work, switching the wrong database, or breaking the migration boundary.

**Authoritative checkpoint:** 2026-09-29  
**Repository:** `https://github.com/remRADAR/RADARSite`  
**Branch:** `main`  
**HEAD:** `129e0fb0bbac35a682abc37168b150409850f5b0` — `Document isolated Supabase PostgreSQL POC`  
**Working tree:** clean and aligned with `origin/main`

## Continuity rule

> A future Manus agent must begin from the repository’s current `main` branch and read this file, `reports/SUPABASE_POC_REPORT_2026-09-29.md`, and `reports/DATABASE_PLATFORM_EVALUATION_2026-09-29.md` before making any change. The Supabase work is an isolated POC only. Do not point RADARSite Production at Supabase, do not change Production `DATABASE_URL`, do not unarchive or modify Neon, and do not perform a CMS, WordPress, media, R2, or production cutover migration without a new explicit approval.

The most recent completed task was the isolated Supabase PostgreSQL proof of concept. It created a separate zero-cost Supabase project, reproduced the RADARSite PostgreSQL schema, loaded a small non-secret fixture, verified JSONB/media/relationship behavior, measured size, and tested bounded HTTPS REST connectivity. Production was not connected or changed.

## Current technical state

### Production remains unchanged

- Production database remains Neon.
- Production `DATABASE_URL` was not changed.
- Neon project/branch/data/schema were not modified.
- Production Vercel environment variables were not changed.
- Production R2 objects, buckets, keys, and media relationships were not modified.
- WordPress content/media were not modified.
- No production cutover was performed.

### Isolated Supabase POC

- **Project name:** `radarsite-supabase-poc`
- **Project ref:** `eoydzywyacoesnowdlge`
- **Organization:** `ehauhmwmklzfwfjstido`
- **Region:** `eu-west-1`
- **Status at checkpoint:** `ACTIVE_HEALTHY`
- **Cost:** `$0/month`
- **Tables:** `studio_content`, `content_media`, `content_media_relationships`
- **POC rows:** 1 JSONB content row, 2 media metadata rows, 4 relationship rows
- **R2 objects uploaded by POC:** 0
- **Supabase REST check:** HTTP 200 with a bounded `limit=1` request

### POC result

**Conditional pass for PostgreSQL compatibility. No-go for production migration.**

The schema, JSONB content, indexes, foreign key, uniqueness constraints, deterministic relationship IDs, ordered inline placements, shared media, featured media, idempotent rerun, and cascade cleanup tests passed.

The POC has one deliberate blocker: Supabase reports **RLS disabled** on all three public tables. Do not treat the POC as safe for a shared preview or production until RLS policies are designed, applied, and tested for anon, authenticated, and service-role access.

## Connectors to activate on the new Manus account

Activate only the connectors required for the next approved phase. Access must be granted to the same GitHub repositories, Vercel team/project, Supabase organization/project, and Cloudflare account. Connector names can vary slightly in the Manus UI; the capability is what matters.

### Required for ordinary continuation

| Priority | Connector/capability | Why it is required | Scope to grant |
|---|---|---|---|
| 1 | **GitHub integration / GitHub CLI** | Clone, inspect, commit, push, and recover RADARSite history | `remRADAR/RADARSite`; do not grant unrelated repositories unless needed |
| 2 | **Supabase connector** | Inspect the isolated POC, run bounded SQL, apply future POC-only migrations, inspect tables and project status | Organization `ehauhmwmklzfwfjstido`; project `eoydzywyacoesnowdlge` only initially |
| 3 | **Vercel connector** | Inspect deployments, preview projects, project metadata, runtime/deployment status, and future isolated preview configuration | `radarsite` and a separate preview project only; do not promote Production automatically |
| 4 | **Cloudflare connector** | Inspect and, only when separately approved, verify R2 media buckets, objects, cache maintenance, and Workers | The RADAR account and `radarsite-media` bucket; read-only initially |
| 5 | **Manus Tools / Browser** | Authenticate to Supabase or Vercel dashboards when MCP/API access is unavailable; read Google Docs prompts; perform browser-only verification | Browser session only; never paste secrets into chat |

### Useful but not required for the immediate Supabase continuation

| Connector/capability | When to activate | Current boundary |
|---|---|---|
| **Neon connector** | Only if the user explicitly authorizes Neon diagnosis, restore, or read-only comparison | Neon is currently quota/archive-blocked; do not connect, unarchive, restore, or mutate it for this POC |
| **Sentry connector** | If the next task is runtime error/502 investigation and the RADARSite Sentry project is known | Optional; not required for Supabase POC completion |
| **Google Workspace/Docs access** | If future prompts continue to arrive through the shared Google Doc | Read-only is sufficient; the current prompt can also be obtained through Manus Browser/Docs export |

### Do not activate or use as a prerequisite

- No payment connector is needed; the Supabase POC was created at `$0/month`.
- No Stripe/payment connector is needed.
- No WordPress publishing connector is needed.
- No production media-upload capability is needed for the next phase.
- Do not expose or copy R2 secrets, Neon credentials, Supabase service-role keys, or Production Vercel secrets into the repository or chat.

## Exact resume protocol for another Manus account

1. Clone the repository:

   ```bash
   gh repo clone remRADAR/RADARSite /home/ubuntu/RADARSite
   cd /home/ubuntu/RADARSite
   git checkout main
   git pull --ff-only origin main
   git rev-parse HEAD
   git status --short --branch
   ```

2. Confirm the checkout is at or ahead of `129e0fb0bbac35a682abc37168b150409850f5b0` and clean.

3. Read these files in this order:

   - `CONTINUITY_CLAUSE.md`
   - `reports/SUPABASE_POC_REPORT_2026-09-29.md`
   - `reports/DATABASE_PLATFORM_EVALUATION_2026-09-29.md`
   - `reports/wordpress-media-audit-2026-09-29/PRODUCTION_SCHEMA_APPLICATION_BLOCKED.md`
   - `MIGRATION_TAKEOVER_HANDOFF.md`
   - `DEVELOPMENT_HANDOFF.md`

4. Verify the Supabase POC project by ref `eoydzywyacoesnowdlge`; do not create a second POC project unless this one has been intentionally deleted or the user authorizes duplication.

5. Do not connect the live RADARSite Vercel application to Supabase. Do not edit Production environment variables.

6. The next safe engineering task is to design and test RLS policies in the isolated Supabase project, followed by a provider-neutral PostgreSQL adapter and a separate Vercel preview. The next task is **not** production cutover.

7. Before any Supabase SQL mutation, state the target project ref explicitly and verify it is `eoydzywyacoesnowdlge`. All read queries must select only needed columns and include explicit `LIMIT`/pagination. Do not use server-side file access or destructive SQL.

8. Before any R2, WordPress, Neon, Vercel Production, or CMS write, stop and request a separate explicit approval unless the user has already approved that exact action in the current continuation.

9. At the end of every future phase, update this file or add a dated report with:
   - current commit
   - connector/project identifiers
   - exact data changed
   - exact data not changed
   - verification commands/results
   - blockers
   - next one-step action

## Next approved-safe work item

The immediate next work item is a **security-policy and adapter preview**, in this order:

1. Design RLS policy roles for the three POC tables.
2. Apply RLS only to the Supabase POC after reviewing the exact SQL.
3. Test anon, authenticated, and service-role access with non-secret fixture data.
4. Add a provider-neutral PostgreSQL adapter without removing the Neon adapter.
5. Create a separate Vercel preview project/environment using only POC credentials.
6. Verify public snapshot fallback, article/archive rendering, Studio reads/writes, cache invalidation, and relationship persistence.
7. Measure size, connections, egress assumptions, and backup/restore behavior.
8. Stop and return a review report. Do not cut over Production automatically.

## Stop conditions

Stop immediately and report rather than continuing if:

- a connector points at a different repository, Supabase project, Vercel project, Cloudflare account, or Neon branch than documented;
- the task requests changing Production `DATABASE_URL`;
- the task requests unarchiving, restoring, deleting, or mutating Neon;
- the task requests production WordPress/R2/media migration;
- RLS policies are not defined but a shared Supabase preview is requested;
- production secrets are requested in chat or in a committed file;
- a database operation cannot be proven to target the isolated POC;
- a migration cannot be rolled back or checkpointed.

## Reports and artifacts

- [Supabase POC report](./reports/SUPABASE_POC_REPORT_2026-09-29.md)
- [Database platform evaluation](./reports/DATABASE_PLATFORM_EVALUATION_2026-09-29.md)
- [Production schema blocker](./reports/wordpress-media-audit-2026-09-29/PRODUCTION_SCHEMA_APPLICATION_BLOCKED.md)
- [Media relationship implementation report](./reports/wordpress-media-audit-2026-09-29/RELATIONSHIP_MODEL_IMPLEMENTATION_REPORT.md)
- [Read-only WordPress media audit](./reports/wordpress-media-audit-2026-09-29/AUDIT_REPORT.md)
- [Migration takeover handoff](./MIGRATION_TAKEOVER_HANDOFF.md)
- [Development handoff](./DEVELOPMENT_HANDOFF.md)

## Continuity acknowledgement for the next agent

Before acting, the next agent should state internally or in its work log:

> I am continuing `remRADAR/RADARSite` from `main` at or after commit `129e0fb`. The latest completed phase is an isolated Supabase POC in project `eoydzywyacoesnowdlge`. Production remains on Neon and is unchanged. The POC is conditionally passed for PostgreSQL compatibility but blocked for shared use until RLS policies are designed and tested. I will not perform production cutover, Neon mutation, WordPress migration, R2 mutation, or Vercel Production changes without a separate explicit approval.
