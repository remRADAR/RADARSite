# Cloudflare migration audit — 2026-11-15

## Scope

This audit was performed from `remRADAR/RADARSite` `origin/main` at `30338be`. The dedicated branch is `migration/cloudflare-only-hosting`. No DNS records, custom-domain bindings, Vercel projects, production secrets, R2 objects, or production deployments were changed.

## Repository state

The repository already contains the Cloudflare/Vinext migration path:

- `vite.config.ts` and `cloudflare.config.ts` define the Vinext Cloudflare build.
- `cloudflare.config.ts` targets Worker `radarsite-staging` with `nodejs_compat`.
- `radarsite-media` is the declared R2 media binding.
- `radarsite-response-store-cache-bodies` is the declared response-store cache bucket.
- `.github/workflows/deploy-cloudflare-staging.yml` is manual-dispatch only and requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- `npm run build:vinext` passes on this branch.

The current source does not require a Vercel-specific runtime configuration for the Cloudflare build. Historical Vercel references remain in migration ledgers and dependency transitive packages; those were not removed because they are historical records or unrelated dependency concerns.

## Cloudflare account verified

The authenticated Cloudflare identity is `mailradarcharts@gmail.com`.

- Account: `Mailradarcharts@gmail.com's Account`
- Account ID: `825459f1f313c6c9427bf6718bbd4907`
- Zone: `radarcharts.net`
- Zone ID: `8c289e422acefca28693a749aa12da19`
- Plan: Free Website

Existing resources verified read-only:

- Worker `radarsite-staging`
- Worker `radarsite-cache-maintenance`
- R2 bucket `radarsite-media`
- R2 bucket `radarsite-opennext-cache`
- R2 bucket `radarsite-response-store-cache-bodies`

## Existing binding risk

Cloudflare currently reports these enabled custom domains as attached to Worker `radarsite-staging` in the `production` environment:

- `radarcharts.net`
- `www.radarcharts.net`
- `staging.radarcharts.net`

This is an existing account state and conflicts with the repository’s documented staging/production separation. It was intentionally not changed. Before any production deploy or DNS/domain operation, the owner should decide whether the Worker should remain the production plan of record and then verify environment naming, runtime secrets, content-store seeding, and rollback behavior.

## Required owner-controlled deployment steps

Before dispatching the Cloudflare workflow, verify that the repository has the required GitHub Actions secrets without exposing their values:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Then deploy only to the intended staging or test surface, verify the Worker and content chain, and perform a separately approved production cutover. The existing Vercel production project must remain untouched until the Cloudflare surface is validated.
