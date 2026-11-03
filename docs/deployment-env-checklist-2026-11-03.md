# Deployment environment checklist (2026-11-03 — Vibe agent)

Owner runbook for wiring the two live hosts of remRADAR/RADARSite. Companion to
docs/deployment-reconciliation-2026-11-01.md. Prepared on branch
deploy/cloudflare-workers-staging. No DNS, production domain, database, or hosting
account was changed from the repo side.

## Agreed target architecture

| Surface | Role | Status |
| --- | --- | --- |
| Cloudflare Worker `radarsite-staging` (Vinext) | Production plan-of-record | Build verified in CI (`npm run build:vinext`, verification run 41267314159); deploy workflow added on this branch, manual dispatch only |
| Vercel project #2 (`radar-site-hazel.vercel.app`) | Staging / preview | Renders the new design but receives no pushes (GitHub integration disconnected on the new Vercel account) and has no content-chain env vars |
| Vercel project #1 (`radarsite`, radarcharts.net) | Legacy production | Serves the stale pre-Oct-26 build; retire only AFTER the DNS cutover |

## 1. GitHub repo secrets (required before the first Cloudflare deploy)

Add under **Settings → Secrets and variables → Actions → New repository secret**
(never paste secret values in chat or commit them):

1. `CLOUDFLARE_API_TOKEN` — create in the Cloudflare dashboard (My Profile → API
   Tokens → Create Token) with, at minimum, **Workers Scripts: Edit** and
   **Account Settings: Read** on the target account; add **Workers R2 Storage: Edit**
   if the deploy needs to provision the response-store bucket binding
   (`radarsite-response-store-cache-bodies`).
2. `CLOUDFLARE_ACCOUNT_ID` — the account ID shown on the Cloudflare dashboard
   overview page (right sidebar).

Then run **Actions → "Deploy (Cloudflare staging)" → Run workflow**. The workflow
fails fast with a clear message if either secret is missing.

## 2. Cloudflare Worker runtime environment

### Verified env vars the code actually reads

| Variable | Purpose | Notes |
| --- | --- | --- |
| `RADAR_CONTENT_STORE=cloudflare` | Read from the R2 content store first | Enables the content chain: R2 → Notion direct → Neon → build snapshot |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | R2 S3 credentials | Server-only; create a dedicated R2 token |
| `R2_BUCKET` | Media/content bucket | `radarsite-media` per .env.local.example |
| `R2_ENDPOINT`, `R2_PUBLIC_BASE_URL` | R2 endpoint + public media base URL | |
| `DATABASE_URL` | Neon Postgres (Studio persistence + content fallback) | Without it Studio runs browser-only and edits do not publish |
| `STUDIO_ADMIN_PASSWORD` | Studio panel admin auth | Server-only |
| `RADAR_NOTION_DIRECT_READ_ENABLED=true` | Notion direct-read tier | Phase 3; needs owner-supplied Notion secrets |
| `NOTION_API_KEY`, `RADAR_NOTION_DATA_SOURCE_ID` | Notion integration | Data-source ID must be re-verified by the workspace owner |
| `RADAR_NOTION_PUBLISHING_ENABLED=false`, `RADAR_NOTION_SYNC_SECRET` | Notion publish webhook | Keep disabled until staging auth/dry-run approved |
| `RADARSITE_CACHE_MAINTENANCE_TOKEN` | Cache-maintenance worker shared secret | Same value the maintenance worker holds |
| `RADAR_TRUSTED_PROXY_HOPS` | Proxy-aware rate limiting | `1` per .env.local.example |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_SENTRY_DSN`/`SENTRY_DSN`, `UNSPLASH_ACCESS_KEY`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_SPLINE_SCENE` | Client-side integrations | These are baked in at BUILD time, so set them wherever the production build runs (GitHub Actions env, or Cloudflare dashboard build settings) — see .env.local.example |

### To verify on the first deploy (unverified in this session)

- The exact mechanism for runtime vars/secrets on the Vinext worker
  (`vinext-cloudflare deploy` wrapping wrangler): non-secret vars likely go in
  `cloudflare.config.ts` inside `defineWorker` `env`; secrets via
  `wrangler secret put NAME` or the Workers dashboard (Settings → Variables and
  Secrets). Confirm on the first dispatch — the deploy itself only needs the two
  repo secrets above; runtime vars affect what the DEPLOYED worker can read.
- The R2 bucket `radarsite-response-store-cache-bodies` (response-store cache)
  must exist in the account before/with the first deploy; the binding is declared
  in cloudflare.config.ts.

## 3. Vercel project #2 (radar-site-hazel) — make pushes land again

Owner-only steps in the Vercel console (new account):

1. Reconnect the GitHub integration: Add New → Project → Import Git Repository →
   select `remRADAR/RADARSite` (grant the Vercel app access to the repo if asked),
   or reconnect it under Settings → Git if a half-connected project exists.
2. Set Production Branch to `main`.
3. Add the same environment variables from section 2 under Settings →
   Environment Variables (Production + Preview). `DATABASE_URL`,
   `STUDIO_ADMIN_PASSWORD`, and the R2 vars are the minimum for real content.
4. Deploy. Then verify the homepage EditorialTree renders homepage-eligible
   (notion/radarsite/studio) articles and the social icons/theme toggle render
   correctly (fixes merged via PR #37 on 2026-11-01).

## 4. Cutover sequence (explicit owner steps, in order — do NOT skip ahead)

1. Add the two GitHub repo secrets (section 1) and dispatch the deploy workflow;
   confirm the `radarsite-staging` Worker serves the new build on its
   workers.dev URL.
2. Set the Worker runtime env vars (section 2) and seed the R2 content store per
   the Neon → R2 seeding runbook in
   docs/deployment-reconciliation-2026-11-01.md (Studio save-once writes
   `content/radarsite-content-v1.json`).
3. Visually verify staging: homepage EditorialTree, media images (CSP origin fix
   from PR #38), social icons, theme toggle, legends route, Studio panel.
4. Owner decision point: DNS cutover radarcharts.net → Cloudflare (one change,
   owner-only, outside this repo). Keep the legacy Vercel project untouched until
   the cutover is confirmed, then retire it.

## 5. Verified vs unverified

Verified: env var names above are read by the code (src/lib/cloudflare-content-store.ts,
src/lib/database.ts, .env.local.example); worker name `radarsite-staging` matches
cloudflare.config.ts; `build:vinext` passes CI. NOT verified: an actual Cloudflare
deploy (needs owner secrets), the runtime-var mechanism on Vinext, the Vercel console
state (no Vercel access from this agent), and DNS.
