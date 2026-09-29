# Supabase RLS and Isolated Preview Verification

**Date:** 2026-09-29
**Repository:** `remRADAR/RADARSite`
**Branch:** `preview/supabase-postgres-adapter`
**Reviewed commit:** `a5d00f5` (`Add provider-neutral PostgreSQL adapter`)
**Supabase target:** `radarsite-supabase-poc` / `eoydzywyacoesnowdlge` only
**Vercel projects inspected:** existing `radarsite-staging` / `prj_2ePtA6DB9iMq8EP2hfukE3D2W93H`; dedicated unlinked project `radarsite-supabase-preview-20260929` / `prj_rWjoh3BgmTKou28TAht52rhpvYkJ`

## Implemented

The isolated Supabase POC now has explicit deny-by-default RLS for all three exposed application tables. The migration was applied through Supabase MCP as `enable_deny_by_default_rls_for_public_tables`.

The migration enabled RLS on `public.studio_content`, `public.content_media`, and `public.content_media_relationships`. It created these policies:

- `deny_direct_api_access_studio_content`
- `deny_direct_api_access_content_media`
- `deny_direct_api_access_content_media_relationships`

Each policy is `FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)`. The migration intentionally did not use `FORCE ROW LEVEL SECURITY`, preserving the existing server-side PostgreSQL adapter contract for privileged backend operations. No data rows were changed by the migration.

## RLS design and access matrix

| Table | RLS | `anon` SELECT | `anon` INSERT/UPDATE/DELETE | `authenticated` SELECT | `authenticated` INSERT/UPDATE/DELETE | Server-side adapter / service role | Rationale |
|---|---|---|---|---|---|---|---|
| `studio_content` | Enabled | Deny | Deny | Deny | Deny | Required | Protected CMS JSON; the existing application uses a custom Studio password/session, not Supabase Auth ownership. |
| `content_media` | Enabled | Deny | Deny | Deny | Deny | Required | Migration and storage metadata is not a public API surface. |
| `content_media_relationships` | Enabled | Deny | Deny | Deny | Deny | Required | Featured/inline editorial placement and migration provenance must not be directly mutable through the public API. |

The POC has no user/session/auth tables, no `user_id` or tenant ownership columns, and no Supabase Auth integration. Therefore there is no legitimate authenticated-user ownership policy to implement at this gate. Authenticated direct API access is denied rather than broadened on an invented ownership model. A future Supabase Auth-backed Studio must introduce and test an explicit role/ownership model before any authenticated policy is added.

## Supabase POC schema state

| Table | Rows observed after migration | RLS |
|---|---:|---|
| `public.studio_content` | 1 | Enabled |
| `public.content_media` | 2 | Enabled |
| `public.content_media_relationships` | 4 | Enabled |

The relationship table retains its existing `featured` / `inline` role check and ordered `placement_index` column. No schema or data migration was performed beyond enabling RLS and adding policies.

## RLS verification results

| Test | Result | Evidence |
|---|---|---|
| Policy catalog inspection | PASS | Three expected policies present; each is `PERMISSIVE`, `ALL`, roles `{anon,authenticated}`, `qual=false`, `with_check=false`. |
| RLS flags | PASS | All three public tables report `rls_enabled=true`. |
| Security advisor | PASS | Supabase security advisor returned no lints. |
| Anonymous SELECT | PASS | `anon` saw 0 rows in all three tables. |
| Authenticated SELECT | PASS | `authenticated` saw 0 rows in all three tables. |
| Anonymous INSERT | PASS | Rejected with PostgreSQL error `42501: new row violates row-level security policy for table "studio_content"`. |
| Authenticated INSERT | PASS | Rejected with PostgreSQL error `42501: new row violates row-level security policy for table "studio_content"`. |
| Authenticated UPDATE | PASS | Returned an empty result set / affected no rows under the deny policy. |
| Authenticated DELETE | PASS | Returned an empty result set / affected no rows under the deny policy. |
| Anonymous DELETE on relationship | PASS | Returned an empty result set / affected no rows under the deny policy. |
| Cross-record isolation | PASS | Both direct API roles saw zero rows across every protected table; no ownership model exists to grant a cross-record exception. |
| Privileged server-side SELECT | PASS | Server-side SQL saw the expected counts: 1, 2, and 4 rows respectively. |
| Privileged server-side writes | PASS | Server-side transaction inserted, updated, and deleted a temporary media row and inline relationship, satisfying the FK, then rolled back; remaining test rows: 0. |
| Production mutation | PASS | No Production database was contacted. |

All write probes were transactionally rolled back. No test rows remain.

## Isolated Preview verification

### Vercel discovery

An existing separate Vercel project was inspected:

- Project: `radarsite-staging`
- Project ID: `prj_2ePtA6DB9iMq8EP2hfukE3D2W93H`
- Team: `remradars-projects`
- Project framework: Next.js
- Existing latest deployment target: Production for the staging project, not the RADARSite Production project
- Existing Preview environment variable names: `DATABASE_URL` and `STUDIO_ADMIN_PASSWORD`

Secret values were not decrypted or read. Because the existing Preview `DATABASE_URL` value is unknown, it cannot be asserted that it points to the Supabase POC rather than Neon. No environment variables were modified on the existing staging project. The dedicated project was created without a Git link, deployment, or database environment variables.

### Preview result

**No Preview deployment was created.** The adapter was reviewed, committed as `a5d00f5`, and pushed only to `preview/supabase-postgres-adapter`. The separate unlinked Vercel project exists, but the required server-side Supabase PostgreSQL URL/password is not available through the Supabase connector. Deploying without it would either fail database verification or require using the existing staging secret whose target is unknown; neither is acceptable.

Consequently, the following runtime checks remain **not verified**:

- startup with `DATABASE_PROVIDER=postgres`
- real adapter connectivity to Supabase PostgreSQL from Vercel Preview
- representative content reads and Studio writes from the deployed runtime
- media relationship queries through the deployed runtime
- runtime authentication/authorization behavior
- serverless connection pooling behavior
- absence of accidental Neon or Production environment-variable inheritance
- deployment logs and generated configuration inspection

This is an intentional hard stop, not a failed deployment. No credentials were requested in chat, logged, committed, or printed.

## Regression verification

| Command | Result |
|---|---|
| `npm run postgres:adapter-contract-test` | PASS; provider selection and invalid-provider rejection; database contacted: false |
| `npm run media-relationships:contract-test` | PASS; database contacted: false; production mutations: false |
| `npm run media:contract-test` | PASS; production contacted: false; real R2 dry run: false |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS; snapshot-only build generated 384 static pages |
| `git diff --check` | PASS |

## Security findings

The POC’s three exposed public tables had RLS disabled before this gate; that finding is remediated in the POC. The security advisor is now clean. Anonymous and authenticated direct API roles cannot read or mutate the protected tables.

The server-side PostgreSQL adapter remains privileged because the current application contract uses server-side database access and a custom Studio session. The adapter is not imported into browser/client code. The migration did not force RLS on the table owner, and no service-role credential was exposed. This privileged path still requires isolated Preview verification before it can be considered validated against real Supabase connectivity.

The existing Vercel staging Preview environment contains a secret `DATABASE_URL` entry whose value was deliberately not read. Until a reviewed Preview deployment explicitly overrides it with the Supabase POC connection URL, provider/environment isolation cannot be proven.

## Production impact

**None observed.** The following remained unchanged and were not accessed for mutation:

- Neon Production
- Vercel Production
- Production environment variables
- R2 production media
- WordPress
- CMS content
- media records and editorial relationships
- DNS and domains

The only external mutation was the reviewed RLS migration in the isolated Supabase POC. All temporary verification writes were rolled back.

## Remaining blockers and next gate

The success condition is not fully met because real Supabase PostgreSQL adapter verification from an isolated Vercel Preview could not be performed without the server-side Supabase POC connection URL/password. The dedicated project is ready for the next safe step, but no environment variables or deployment were created.

The remaining requirement is:

1. configure only the dedicated project’s Preview environment with `DATABASE_PROVIDER=postgres` and a server-side `DATABASE_URL` belonging to Supabase project ref `eoydzywyacoesnowdlge`; then
2. deploy commit `a5d00f5` to that Preview and run the runtime checks above.

The hard stop is active. Do not change Vercel Production, Neon Production, production schemas, production data, R2, WordPress, DNS, or perform a database cutover. Do not deploy with an unknown database target or expose credentials. The reviewed branch is committed and pushed; no merge into `main` occurred.
