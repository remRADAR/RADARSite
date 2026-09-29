# Supabase `studio_settings` RLS Remediation — 2026-09-29

## Final status

> **SUPABASE PREVIEW SECURITY GATE PASSED**

This was an isolated Supabase POC security remediation only. The change was applied to project `radarsite-supabase-poc` (`eoydzywyacoesnowdlge`) and was not applied to Neon Production, Vercel Production, WordPress, Cloudflare R2, DNS, redirects, or production editorial data.

The pull request remains draft and was not merged.

## Original finding

Before remediation, Supabase reported a critical `rls_disabled_in_public` finding for `public.studio_settings`. The table was exposed to the `anon` and `authenticated` roles through the Supabase client API surface because RLS was disabled.

The table definition at inspection time was:

| Property | Observed value |
|---|---|
| Table | `public.studio_settings` |
| Columns | `id integer`, `settings jsonb`, `updated_at timestamptz` |
| Primary key | `id` |
| Existing rows | `0` |
| Owner | `postgres` |
| Indexes beyond primary key | None observed |
| Constraints | Primary key on `id`; `settings` is required; `updated_at` defaults to `now()` |

No settings values or credentials were exposed in the inspection or this report.

## Purpose and sensitivity classification

`studio_settings` stores normalized RADAR site-configuration overrides: public-facing logo and SEO values, social links, playlist configuration, homepage/media references, Motherland banner configuration, navigation, case studies, process steps, testimonials, and contact CTA configuration.

The contents are **public presentation configuration**, not credentials or privileged infrastructure settings. The application still treats the table as a server-owned persistence table because direct Supabase client access would bypass application normalization, authentication, same-origin mutation checks, rate limits, and the public/private response boundaries implemented by the Next.js routes.

No direct browser Supabase client was found. Browser code talks to the application routes; the server uses the PostgreSQL connection from `DATABASE_URL`.

## Application access paths

### Reads

- `src/lib/studio-server.ts:readStudioSettings()` creates the table if needed and reads only `settings` for `id = 1` with `LIMIT 1`.
- `src/app/api/studio/route.ts:GET` calls `readStudioSettings()` and returns normalized settings through the application API.
- `src/components/LiveSiteOverrides.tsx` fetches `/api/studio` to synchronize public site overrides; it does not connect directly to Supabase.
- `src/components/platform/RadarAdminPanel.tsx` fetches `/api/studio` for the Studio configuration view.

### Writes

- `src/lib/studio-server.ts:writeStudioSettings()` normalizes and size-limits the payload, then performs an upsert at `id = 1`.
- `src/app/api/studio/route.ts:PUT` requires a valid Studio session and same-origin mutation before calling `writeStudioSettings()`.
- `src/components/platform/RadarAdminPanel.tsx` submits settings through `PUT /api/studio`.
- `src/app/api/admin/save-config/route.ts` is a separate authenticated local-preview configuration route; it normalizes and returns the submitted config and does not write `studio_settings`.

The direct database connection observed through the isolated Supabase SQL tool used `postgres` as both `current_user` and `session_user`. No browser-side privileged database credential is present in the repository.

## RLS decision

The narrowest safe model is:

```sql
ALTER TABLE public.studio_settings ENABLE ROW LEVEL SECURITY;
```

No `anon` or `authenticated` policies were created. `FORCE ROW LEVEL SECURITY` was not enabled.

This is deliberate. The application’s public configuration is exposed through the normalized Next.js API response, while direct Supabase access is not part of the application architecture. Adding broad Supabase `SELECT` or write policies would create a second access path and would bypass the application’s normalization and mutation controls. The privileged server-side PostgreSQL role continues to serve the application path.

The migration was applied to the isolated project with the name `enable_studio_settings_rls`. No other table policy or RLS setting was changed.

## Direct access verification

The following checks were performed against the isolated POC database:

| Context | Read result | Write result |
|---|---|---|
| `anon` role | `0` visible rows under RLS | Insert probe denied; transaction rolled back |
| `authenticated` role | `0` visible rows under RLS | Insert probe denied; transaction rolled back |
| Privileged server-side `postgres` role | Read succeeded; `0` rows initially | Existing application path remained usable |

The write probes used temporary IDs inside rolled-back transactions. No probe data remained.

## Preview Studio validation after remediation

The deployed Preview application remained reachable at `https://radarsite-staging-lzv9xkr24-remradars-projects.vercel.app`.

| Validation | Result |
|---|---|
| Studio settings read | HTTP `200`; normalized settings returned through the app route |
| Settings write | HTTP `200`; `saved=true` |
| Settings read after write | HTTP `200`; same normalized key shape |
| Settings cleanup | Temporary `id = 1` row deleted; isolated table returned to `0` rows |
| Studio library read | HTTP `200`; 5 items returned from 342 total records |
| Article read | HTTP `200` |
| Article temporary metadata write | HTTP `200`; `saved=true` |
| Article restore | HTTP `200`; `saved=true` |
| Article final read | HTTP `200`; temporary marker absent |
| Public `/ontheradar/articles` route | HTTP `200` |

All Preview operations were reversible. No production record was involved.

## Security advisor result

After remediation, the previous critical `RLS Disabled in Public` finding for `public.studio_settings` no longer appeared.

The advisor now reports one informational finding: `rls_enabled_no_policy` for `public.studio_settings`. This is expected and documents the intentional deny-by-default model. It is not a request to add broad policies. The table is not exposed to direct `anon` or `authenticated` Supabase clients.

The existing protected tables were rechecked and remain unchanged:

| Table | RLS | FORCE RLS |
|---|---:|---:|
| `public.studio_content` | enabled | false |
| `public.content_media` | enabled | false |
| `public.content_media_relationships` | enabled | false |
| `public.studio_settings` | enabled | false |

## Regression tests

The requested checks were run with these results:

- `npm run postgres:adapter-contract-test` — **PASS**. Added a network-free contract test covering provider selection, missing URL handling, and unsupported provider rejection.
- `npm run cms:taxonomy-contract-test` — **PASS**.
- `npm run cms:workflow-contract-test` — **PASS**; no database contact and no production modification.
- `npm run media:contract-test` — **PASS**; no production contact and no real R2 dry run.
- `npm run media-health:contract-test` — **PASS**; no production contact.
- `npm run media-relationships:contract-test` — **PASS**; no production mutation.
- `npx tsc --noEmit` — **PASS**.
- `npm run lint` — **PASS** with the existing non-blocking `@next/next/no-img-element` warning in `CmsStudioPanel.tsx`.
- `git diff --check` — **PASS**.
- `npm run build` — **PASS**; 384 static pages generated.
- `npx playwright test tests/e2e/cms-studio.spec.ts --workers=1` — **PASS**; 3 tests passed.

## Production-safety verification

Verified unchanged for this task:

- Neon Production: unchanged; not queried, restored, unarchived, or mutated.
- Vercel Production: unchanged; no Production deployment.
- Production environment variables: unchanged and not decrypted.
- WordPress: unchanged; no import or migration started.
- Cloudflare R2: unchanged; no objects, buckets, keys, or cache changed.
- DNS: unchanged.
- Redirects: unchanged.
- Production editorial data: unchanged.
- Production schemas: unchanged.
- `main`: unchanged; the CMS pull request remains draft.

## Recommendation

The isolated Supabase Preview security gate is closed for the `studio_settings` RLS issue. Keep the PR draft until a human reviewer confirms the policy decision and the report. Do not merge to `main`, deploy to Production, begin WordPress/media/R2 migration, activate redirects, or change DNS as part of this task.
