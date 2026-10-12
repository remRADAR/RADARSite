# RADARSite

This repository contains the RADARSite web experience — a Next.js (App Router) site for remRADAR, built with TypeScript and Tailwind CSS, using Neon Postgres for content storage, Cloudflare R2 for media, and Sentry for monitoring.

## Getting started

```bash```
npm install
cp .env.local.example .env.local   # then fill in values
npm run dev
``````

Requires Node 20+.

## Environment variables

See `.env.local.example` for the full list. Key groups:

- **Database** — Neon/Postgres connection settings
- **Media (R2)** — Cloudflare R2 bucket credentials and `R2_PUBLIC_BASE_URL`
- **Monitoring** — Sentry DSNs (client/server/edge)
- **Analytics** — Google Analytics / Tag Manager IDs

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build (skips database via `RADAR_SKIP_DATABASE=1`) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Lint + typecheck |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run test:a11y` | Accessibility checks |
| `npm run test:csp` | Content-Security-Policy contract test |
| `npm run cms:*` | CMS diagnostic / reconciliation / contract-test tools |
| `npm run media*` | WordPress media migration contract tests |
| `npm run verify:live-routes` | Verify live editorial routes |

## Project structure

- `src/app` — App Router pages, route groups (`(marketing)`, `(platform)`), admin, API routes
- `src/components` — UI, marketing, platform, and motion components
- `src/lib` — Database, content, media, SEO, and security helpers
- `scripts/` — Contract tests and operational scripts
- `cloudflare/` — Cloudflare configuration
- `docs/`, `reports/`, `qa-artifacts/` — Reference documentation and audit output

## Notes

- Production builds intentionally skip database access (`RADAR_SKIP_DATABASE=1`); database-backed behavior is validated by the contract-test scripts.
- Many root-level `*.md` files are one-time migration/audit reports kept for historical reference.
