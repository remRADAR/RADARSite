# Supabase Preview Adapter Validation — 2026-09-29

## Result

**PASS for isolated Preview runtime validation. Not a Production migration or cutover.**

The CMS integration branch now has an opt-in provider-neutral PostgreSQL adapter. Neon remains the default provider; Preview selected `DATABASE_PROVIDER=postgres` and used the isolated Supabase POC connection only.

## Identity

- Repository: `remRADAR/RADARSite`
- Branch: `cms-integration-2026-09-29`
- Adapter commit validated: `b1ac62cabd854ce57beeb3d7354f1f8da6fbd992`
- Supabase project: `radarsite-supabase-poc`
- Supabase project ref: `eoydzywyacoesnowdlge`
- Supabase region: `eu-west-1`
- Supabase status: `ACTIVE_HEALTHY`
- Vercel project: `radarsite-staging`
- Vercel deployment: `dpl_F9efpdawJBCp59anKHr1RzBhaZBn`
- Preview URL: https://radarsite-staging-lzv9xkr24-remradars-projects.vercel.app
- Deployment state: `READY`
- Deployment Git SHA: `b1ac62cabd854ce57beeb3d7354f1f8da6fbd992`

## Code change

The branch previously still imported `@neondatabase/serverless` directly from `content-server.ts` and `studio-server.ts`; no provider-neutral adapter existed despite the earlier brief. This was a concrete compatibility blocker, so the smallest safe change was made:

- Added `src/lib/database.ts`.
- Added the `postgres` client dependency.
- Preserved Neon as the default provider.
- Added opt-in `DATABASE_PROVIDER=postgres` selection for a generic PostgreSQL/Supabase pooler URL.
- Kept `prepare: false` and a small connection cap for transaction-pooler compatibility.
- Reused the existing SQL, JSONB schema, snapshot fallback, cache behavior, media schema, and relationship model.
- No Neon code path was removed.

## Vercel Preview configuration

Only the staging project’s **Preview** environment was changed:

- `DATABASE_PROVIDER=postgres` — plain config value.
- Existing Preview `DATABASE_URL` — replaced in place with the isolated Supabase transaction-pooler URL by the authorized user through Vercel’s secure form.

Production environment variables were not read, changed, decrypted, or copied. No secret value is recorded in this report.

## Verification

### Local checks

- TypeScript: **PASS**
- ESLint: **PASS** with the pre-existing `@next/next/no-img-element` warning in `CmsStudioPanel.tsx`
- `git diff --check`: **PASS**
- CMS taxonomy contract: **PASS**, no database contact
- CMS workflow contract: **PASS**, no production modification
- Local mock Studio library: **PASS**, no database contact
- Media relationship contract: **PASS**, no production mutation

### Vercel build

- Exact adapter commit cloned from the dedicated branch.
- Dependencies installed successfully.
- Next.js production build compiled successfully.
- TypeScript completed successfully.
- 384 static pages generated successfully.
- Deployment reached `READY`.

### Runtime

1. Public Preview homepage rendered successfully from the new deployment.
2. Authenticated Studio library request:
   - Request: `/api/studio?view=library&page=1&pageSize=5`
   - HTTP status: `200`
   - Returned items: `5`
   - Total library records: `342`
   - Server pagination: `pageSize=5`
   - Taxonomy response keys: `editorialTypes`, `magazineSubtypes`, `projectSections`
3. Reversible Studio persistence round trip against the Supabase POC:
   - Read an existing article: `200`.
   - Updated only `metaDescription` with a temporary marker: `200`, `saved=true`.
   - Restored the original article payload: `200`, `saved=true`.
   - Read after restore: `200`.
   - Temporary marker present after restore: **false**.
   - No new record, media object, R2 key, WordPress record, or Production row was created.

## RLS posture

The isolated POC was inspected after the policy work:

- `public.studio_content`: RLS enabled; deny-by-default `anon`/`authenticated` policy present.
- `public.content_media`: RLS enabled; deny-by-default `anon`/`authenticated` policy present.
- `public.content_media_relationships`: RLS enabled; deny-by-default `anon`/`authenticated` policy present.
- `public.studio_settings`: **RLS disabled**; Supabase security advisor reports this as a critical finding.

The application uses a privileged PostgreSQL connection for server-side Studio settings access, so this did not block the article library/read/write round trip. It remains a hard security follow-up before treating the POC as a generally shareable Supabase environment. Do not expose `studio_settings` through the Supabase client API. The advisor’s remediation SQL was not auto-applied.

## Unchanged boundaries

- Production remains on Neon.
- Production `DATABASE_URL` and `STUDIO_ADMIN_PASSWORD` were not changed.
- Neon was not unarchived, restored, queried, or mutated.
- Vercel Production was not deployed or modified.
- Cloudflare R2 objects, buckets, keys, and cache were not changed.
- WordPress content and media were not changed.
- No production CMS content or media relationship was changed.
- No Supabase service-role key or database password was committed or written to chat.

## Remaining gates

1. Apply and test an explicit RLS posture for `public.studio_settings` in the isolated POC only, after reviewing the exact SQL.
2. Add a safe database health/quota diagnostic and external logical backup/restore drill for Supabase Free.
3. Validate the settings save path after the `studio_settings` policy decision.
4. Keep Preview-only credentials and project scope isolated.
5. Request a separate human review before any Production database, Vercel Production, WordPress, R2, or migration cutover action.

## Next one-step action

Review the exact `studio_settings` RLS SQL and test anon/authenticated/service-role behavior in the isolated Supabase project. Do not change Production.
