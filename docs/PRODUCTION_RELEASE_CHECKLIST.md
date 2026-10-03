# Production release preparation

**Prepared:** 2026-10-03
**Scope:** repository-side Vercel/build preparation only. No deployment, promotion, merge, DNS change, database change, or Vercel environment-variable update was performed.

## Deployment profile

- Hosting: the existing Vercel projects, using Vercel's native **Next.js** framework integration.
- Runtime: **Node.js 24.x**, matching the Node 24.x setting observed in both the `radarsite` and `radarsite-staging` Vercel projects.
- Package installation: `npm ci` from the committed `package-lock.json`.
- Build: `npm run build`, which runs `RADAR_SKIP_DATABASE=1 next build`.
- `.nvmrc`, `package.json`'s `engines.node`, the lockfile root metadata, and `vercel.json` now agree on this setup. No standalone/Docker output mode is configured; Vercel's built-in Next.js runtime remains in use.

## Build-time database safety

The Vercel staging build observed during preparation compiled and type-checked, then timed out while prerendering paginated article-category routes. Its logs showed repeated `studio_settings` `CREATE TABLE IF NOT EXISTS` notices even though the build script sets `RADAR_SKIP_DATABASE=1`. Public-site metadata reads were not honoring that flag.

The build/runtime boundary now uses one shared policy:

- During a production build, content renders from the committed snapshot and public-site overrides use their safe defaults.
- Static generation does not call `readStudioSettings()` or issue database DDL/read queries.
- At runtime, database access remains enabled and the Studio settings path is unchanged.
- Both `RADAR_SKIP_DATABASE=1` and Next.js's `NEXT_PHASE=phase-production-build` enforce the build guard, including direct `next build` invocations.

Because category-archive metadata is generated at build time, its initial static HTML uses the default public-site overrides instead of values stored only in the runtime database; verify those defaults are acceptable for SEO/social previews, or supply an approved non-database build-time source for those values.

This avoids build-time dependence on whichever database is configured in a Vercel project and prevents prerender from attempting schema creation. The remote staging build must still be rerun after these changes; the log evidence does not prove that database calls were the only source of its route timeouts.

## Repository validation

The GitHub Actions workflow `.github/workflows/production-build.yml` runs on pull requests into `main` and pushes to `main`. It uses Node 24 and runs:

1. `npm ci`
2. `npm run lint`
3. `npx tsc --noEmit`
4. `npm run test:build-environment`
5. `npm run test:ambient`
6. `npm run build`

The workflow needs no production credentials. It is validation, not a deployment gate by itself; enforce the status check through the repository's existing branch-protection policy if that is the intended release control.

## Local validation performed

Validated under **Node v24.21.0** after a fresh `npm ci`:

- ESLint: **PASS**, with one pre-existing non-blocking `<img>` warning in `src/components/admin/CmsStudioPanel.tsx`.
- TypeScript (`npx tsc --noEmit`): **PASS**.
- Build-environment contract: **PASS**, 3 assertions.
- Ambient-audio contract: **PASS**.
- Production build: **PASS**, all **459/459** static pages generated.
- Database-isolation sentinel: **PASS**; a production build with a synthetic loopback-only PostgreSQL URL completed with **zero** TCP connection attempts and generated all **459/459** pages.

At this local-preparation checkpoint, the GitHub Actions workflow had not yet run and no new Vercel Preview/staging deployment had been triggered. The subsequent PR validation outcome is recorded in the remote-validation addendum below.

## Remote validation addendum — 2026-10-03

Validation was run from the approved draft PR [#5](https://github.com/remRADAR/RADARSite/pull/5), branch `ci/radar-staging-validation-2026-10-03`, code commit `4b083b65f18f8fe071cfb2d052805d702579b908`.

- GitHub Actions run [37086137956](https://github.com/remRADAR/RADARSite/actions/runs/37086137956): **PASS** in 1m26s. Locked install, lint, TypeScript, build-environment contract, ambient-audio contract, and production build all passed.
- The PR reported **5 successful, 0 failed, and 0 pending checks**.
- Automatic Vercel deployments completed successfully, all with Preview target (`target: null`): `radarsite-staging` deployment `dpl_DNX74H2kJcJNYoQPivDXcUjHZE8o`; `radarsite` Preview deployment `dpl_AaKP4PLxLR6cgzkYu6qh1FnmHuox`; and isolated `radarsite-supabase-preview-20260929` deployment `dpl_Ed5aFzCG1TvceGAoP1uajWKJ4MJU`.
- No merge or Production-target deployment occurred. PR #5 remains a draft. It overlaps the existing audio PR #4; reconcile the two before any future merge.
- Non-blocking log warnings: npm reported **8 high-severity dependency advisories**; GitHub noted the pinned `actions/checkout@v4` and `actions/setup-node@v4` currently target Node 20 (forced to Node 24), the pre-existing `<img>` lint warning, and the upcoming `ubuntu-latest` runner migration. These were not remediated as part of this validation.

## Vercel runtime environment review

Verify the existing **Production** environment in Vercel without copying secret values into Git, this document, or chat:

- `DATABASE_URL`: production **Neon** connection only. Do not substitute the Supabase POC/preview URL. `DATABASE_PROVIDER` defaults to `neon`; leave it unset or set it to `neon` for Production.
- `STUDIO_ADMIN_PASSWORD`: server-only Studio authentication secret.
- `NEXT_PUBLIC_SITE_URL`: the canonical HTTPS production origin.
- For Studio media uploads, verify `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET`; if used, verify `R2_ENDPOINT` and `R2_PUBLIC_BASE_URL` are consistent with the production bucket and public delivery domain.
- `UNSPLASH_ACCESS_KEY` is optional and should only be set if that feature is enabled.
- If the cache-maintenance integration is active, verify its matching server/Worker secrets in their respective secure environments; do not commit them.

The repository contains no production credential values. This preparation did not inspect or change the values stored in Vercel.

## Read-only Vercel status observed during preparation

- `radarsite-staging`'s latest observed deployment, from `feat/single-background-sound` at `a20329c`, ended in `ERROR`. The build failed during static generation after repeated 60-second timeouts on category pagination routes. The `studio_settings` notices in the log were PostgreSQL notices, not by themselves the reported failure.
- The `radarsite` project's latest observed deployment for the same feature-branch commit was `READY`, but its deployment target was `null`; that is not evidence that this change has been promoted to Production.
- No deployment was triggered or promoted as part of this work.

Treat a fresh successful staging/Preview build and route/audio smoke test as prerequisites before a production cutover. Resolve branch protection or promotion according to the existing organization process rather than bypassing it.

## Release sequence

1. Open/review the repository change through the normal PR process; do not deploy this uncommitted working tree directly.
2. Require the new Node 24 production-build validation workflow to pass.
3. Run a fresh Vercel Preview/staging build and confirm archive pagination prerender completes without database access or timeout.
4. Verify the Production Vercel environment still points at Neon and has the required runtime settings; do not change database providers or secrets as part of this release.
5. Smoke-test the public homepage, representative article/category pages, Studio runtime, and `/audio/backgroundsound.mp3` in the preview deployment. Confirm the background player still follows its user-activation and audio-ducking behavior.
6. Promote/merge only through the repository's established production process, then verify the canonical domain and production audio asset.

## Local release check commands

Run on Node 24:

```sh
npm ci
npm run lint
npx tsc --noEmit
npm run test:build-environment
npm run test:ambient
npm run build
```
