# Cloudflare Workers staging migration — retrace & status (2026-10-28)

Written by the Vibe agent on behalf of the user, retracing the 2026-10-28 staging-migration
commits on `main` before handing the build to the next agent (Sesori AI trial). This file is a
dated ledger entry in the spirit of `HANDOFF.md`; fold its contents into `HANDOFF.md` when that
ledger is next updated (its newest entry is 2026-10-26, so today's work is otherwise unrecorded).

## What the user thought happened vs. what actually happened

The user believed the staging build commit "failed to commit on GitHub." Verified retraces show
all commits DID land on `main`. What failed was CI on two of the staging commits; both failures
were subsequently fixed and `main` CI is green as of 2026-10-28.

## Verified commit/CI sequence (2026-10-28, from the public Actions page + commit list)

| SHA (short) | Message | CI |
|---|---|---|
| 5f92919 | Fix current CMS homepage and media fallbacks | (older window, status not re-verified) |
| 8d7dcc6 | Prioritize Notion and studio stories on homepage | CI #160 SUCCESS |
| b135693 | chore: prepare Cloudflare staging build | no green run pinned to this SHA in the visible window |
| 7ccad41 | fix: align staging build React dependencies | CI #161 FAILED |
| 5fd7e5a | fix: use typed Cloudflare build plugin | CI #162 FAILED |
| adc9c25 | fix: use Node runtime for social card route | CI #163 SUCCESS |
| 270eb87 + 0b1bb1f | chore: remove obsolete Vercel configuration; fix: regenerate Next route types before typecheck | CI #164 SUCCESS — main head is 0b1bb1f |

`b135693` introduced the Vinext Worker migration: `vite.config.ts` (vinext + @cloudflare/vite-plugin
with responseStoreAdapter), `cloudflare.config.ts` (Worker `radarsite-staging`, entrypoint
`vinext/server/fetch-handler`, nodejs_compat, R2 response-store cache bucket
`radarsite-response-store-cache-bodies`), `empty-stub.js` (sharp unavailable in the Worker runtime),
package.json scripts `dev:vinext` / `build:vinext` / `start:vinext` / `deploy:vinext`, and staging
deps (vinext, @vinext/cloudflare, @cloudflare/vite-plugin, cf, vite 8, @vitejs/plugin-rsc).
`270eb87` removed Vercel configuration artifacts (public/vercel.svg, the Vercel-deployment trigger
from production-healthcheck.yml, Vercel references across scripts/configs).

## Verified facts

- `main` CI is green at CI #164 (head 0b1bb1f, pushed 2026-10-28T15:08Z).
- CI (`.github/workflows/ci.yml`) runs lint + typecheck + `npm run build` (Next build with
  RADAR_SKIP_DATABASE=1) only. It never runs `npm run build:vinext`.
- Live fetch of https://radarcharts.net/ on 2026-10-28 (~16:30 UTC) served the site normally
  (production remains on Vercel; the DNS/production cutover has NOT happened).
- The live homepage Editorial Tree still renders a legacy WordPress article — "GANDE IS BREAKING
  BOUNDARIES WITH \"INSTA BABE\"" — with an "Image unavailable" media card.
- No `workers.dev` URL or `radarsite-staging` deploy evidence exists anywhere in the repo, and
  no GitHub Actions workflow runs `deploy:vinext`.

## Known defects / open items (status: open)

1. **Vinext/Workers build unverified.** Nothing runs `npm run build:vinext`; the CI green state
   proves nothing about the Workers build. Run it locally and fix any errors first.
2. **`radarsite-staging` deployment state unknown.** `npm run deploy:vinext`
   (`vinext-cloudflare deploy`) requires Cloudflare credentials that are not in the repo. No
   evidence the Worker, its R2 cache bucket, or its bindings exist in the Cloudflare account.
3. **Possible config mismatch.** `cloudflare.config.ts` builds the cache config with
   `worker: "radarsite"` but the Worker is named `radarsite-staging`. Confirm the response-store
   adapter tolerates the name mismatch before deploying, or align the names.
4. **Legacy article + missing image still live on production.** The Oct 28 homepage commits
   (5f92919, 8d7dcc6) were meant to fix this; live HTML still shows the Gande legacy card with
   "Image unavailable". Either the deployed Vercel build predates the fix, the fallback still
   admits legacy records, or the media fallback still fails. Verify against the newest Vercel
   deployment before writing more code.
5. **Vercel decommission started while production is still on Vercel.** 270eb87 removed Vercel
   config/healthcheck triggers while radarcharts.net is still served by Vercel. Keep Vercel
   production untouched until staging is validated; plan the DNS cutover explicitly.
6. **Daily site and dependency audit workflow has failed every day since Oct 16** (runs #1–#14);
   separate from the staging work but still unfixed.
7. npm audit advisories (1 moderate, 5 high as of Oct 26) remain unaddressed.

## Next steps (ordered)

1. Run `npm run build:vinext` locally; fix Workers build errors.
2. Deploy and smoke-test the `radarsite-staging` Worker (needs Cloudflare account access);
   verify homepage, an article route, an archive page, and media loading.
3. Verify the production homepage against the newest Vercel deploy; if the legacy Gande card
   still renders, fix the featured-pipeline fallback / media fallback.
4. Only after staging validation: plan the Vercel → Cloudflare cutover (DNS, env vars,
   bindings, R2, healthchecks) as an explicit, user-authorized step.

## Not verified in this session

- `npm run build:vinext`, `npm run deploy:vinext`, and all repo tests (no Node runtime available
  to this agent).
- Cloudflare account state (no Cloudflare connector available to this agent).
- Which Vercel deployment is currently live and which commit it corresponds to.
