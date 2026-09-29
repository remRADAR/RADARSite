# Provider-Neutral PostgreSQL Adapter Implementation

**Date:** 2026-09-29
**Repository:** `remRADAR/RADARSite`
**Branch:** `main`
**Scope:** Code implementation only; no provider migration or deployment

## Implemented

- Added `src/lib/postgres.ts` as the persistence boundary for PostgreSQL access.
- Preserved Neon as the default provider when `DATABASE_PROVIDER` is unset or set to `neon`.
- Added a generic PostgreSQL provider using the `postgres` driver for PostgreSQL-compatible targets such as the isolated Supabase POC.
- Added bounded serverless connection settings for the generic provider and disabled prepared statements for transaction-pooler compatibility.
- Reused the adapter from `content-server.ts` and `studio-server.ts`; application persistence modules no longer import the Neon client directly.
- Added `DATABASE_PROVIDER=neon` to `.env.local.example`.
- Added a provider-selection contract test that does not contact a database.

## Provider configuration

```text
DATABASE_URL=postgresql://...
DATABASE_PROVIDER=neon       # existing production-compatible default
# DATABASE_PROVIDER=postgres  # isolated PostgreSQL-compatible preview/POC path
```

No Supabase credentials were added to the repository. The adapter does not select Supabase automatically and does not change Production configuration.

## Verified

- `npm run postgres:adapter-contract-test` — PASS; default provider, Neon selection, generic PostgreSQL selection, and invalid-provider rejection; database contacted: false.
- `npm run media-relationships:contract-test` — PASS; database contacted: false; production mutations: false.
- `npm run media:contract-test` — PASS; production contacted: false; real R2 dry run: false.
- `npx tsc --noEmit` — PASS.
- `npm run lint` — PASS.
- `npm run build` — PASS; snapshot-only build generated 384 static pages.
- `git diff --check` — PASS.

## Not verified

- No connection was made to Neon or Supabase.
- The generic provider has not yet been exercised against the Supabase POC from a Vercel Preview or isolated runtime.
- RLS policies have not been applied or tested.
- No provider cutover, preview deployment, schema migration, or data migration was performed.

## Production impact

None observed. Neon Production, Production `DATABASE_URL`, Vercel Production, R2, WordPress, CMS content, media records, and editorial relationships were not accessed or changed.

## Risks

- The generic provider requires a valid PostgreSQL connection URL and a separately authorized server-side credential.
- Supabase compatibility remains conditional on RLS design/testing, connection behavior, and preview runtime verification.
- The `postgres` driver is available to server-side modules only; it must not be imported into browser/client code.
- Existing dependency audit findings remain separate and were not remediated by this change.

## Next gate

Create a separate isolated preview configuration using only Supabase POC credentials, after RLS policies are designed and tested. Do not change Production `DATABASE_URL` or promote a preview automatically.
