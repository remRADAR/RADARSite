# CI and deployment safeguards (2026-11-24)

Short note on the guards added to the GitHub Actions workflows after the React
dependency fix. Companion to `docs/deployment-env-checklist-2026-11-03.md`.

## What the dependency fix was

`package.json` was bumped to `react` / `react-dom` `^19.3.1` and
`@react-three/fiber` `^9.8.2`, but `package-lock.json` still pinned
`react` 19.2.9 / `fiber` 9.6.1. `npm ci` therefore failed with `ERESOLVE`
(`react-server-dom-webpack@19.3.1` and `vinext@1.4.6` both require
`react@^19.3.1`, while `@react-three/fiber@9.6.1` capped React at `<19.3`),
and the deploy workflow could not get past the install step.

The lockfile is now in sync. `npm ci` is the clean-install check in both
workflows and will fail loudly if the two files ever drift apart again.

## Guards added

| Guard | `ci.yml` | `deploy-cloudflare-staging.yml` |
| --- | --- | --- |
| Disk-space preflight before install | yes | yes |
| Job `timeout-minutes` | 20 | 25 |
| Concurrency group | cancels superseded runs on the same branch/PR | kept `cancel-in-progress: false` |

**Disk-space preflight.** Reports available space on `/` and fails with a clear
`::error::` below 5 GB, instead of dying mid-install with an opaque `ENOSPC` or
exit 137. It only reports — it never deletes anything.

**Timeouts.** A hung install or build now fails the job rather than occupying a
runner for GitHub's 6-hour default.

**Concurrency.** CI cancels superseded runs so a stale commit cannot report a
misleading result. Deploys deliberately do **not** cancel in progress: a
half-applied Worker upload is worse than a queued one.

## What was deliberately not changed

- No existing check was removed or weakened: `npm ci`, the media reference
  contract test, lint, typecheck and the production build all still run, in the
  same order.
- No deploy step, secret, environment variable, DNS record or production
  setting was touched.
- The lockfile was not regenerated — it was already consistent.

## Known pre-existing failure

`npm run lint` fails with `typescript-eslint does not support TS 7.0`. This is
independent of the dependency fix: `typescript` is pinned at `^7.0.0` and
`eslint-config-next` bundles a `typescript-eslint` that only supports the TS 6
API. Fixing it means pinning TypeScript to 6.x or upgrading
`eslint-config-next` — a separate change, not made here.
