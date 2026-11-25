# Production write path — Neon connection fix (2026-11-25)

Companion to `docs/deployment-env-checklist-2026-11-03.md`. This note records the
cause of the production write failure seen in the 2026-11-25 Manus E2E run and the
code change that fixes it.

## Symptom

Every production **write** failed, while every production **read** worked:

```
Server error (HTTP status 530): error code: 1016
```

Affected: release-link save (Spotify + Ampsuite), detector run, verified-profile
registry add/update, and any other path that touches Neon.

## Cause

`@neondatabase/serverless` does not speak Postgres over TCP in the Worker. It issues
queries as HTTP POSTs to an endpoint derived **from the connection host**:

```js
// node_modules/@neondatabase/serverless/index.js — default `fetchEndpoint`
fetchEndpoint: (host) => "https://" + host.replace(/^[^.]+\\./, "api.") + "/sql"
```

So `ep-x-123.eu-central-1.aws.neon.tech` → `https://api.eu-central-1.aws.neon.tech/sql`
which is a real Neon edge endpoint. But a custom or non-Neon host such as
`db.radarcharts.net` → `https://api.radarcharts.net/sql`, which **does not exist**.
Cloudflare cannot resolve that origin → **error 1016** → surfaced to the browser as
**HTTP 530**. This is why the failure was write-only in practice: the read paths are
served from the R2 content store / committed snapshot and never reach Neon, while
`release_links` / `artist_profiles` / `studio_settings` live only in Neon.

The error string is produced at `index.js:1315`:
`throw new q(\`Server error (HTTP status ${G}): ${N}\`)` — an exact match for the
reported message.

## Change

`src/lib/database.ts`

- `resolveNeonConnection()` — validates the host against
  `ep-<id>.<region>.aws.neon.tech`, normalizes a direct host to its `-pooler` form,
  derives the `api.<region>` endpoint, and rejects a non-Neon/custom host with an
  actionable error **before** any query runs. `NEON_HTTP_ENDPOINT` allows an explicit
  override for a custom domain.
- `neonConfig.fetchEndpoint` is pinned to the resolved endpoint, so the driver can
  never derive `api.<custom-domain>`.
- `classifyDatabaseError()` — separates `dns-endpoint` (1016/530, `ENOTFOUND`) from
  `quota` (402), `auth` (401/403), and `transient` (5xx). A DNS failure is **not**
  retried (retrying cannot succeed) and is re-thrown with the pooled-host remedy.
  Transient 5xx retries with exponential backoff (400/800/1600 ms), replacing the
  previous single fixed 800 ms retry that discarded the original error context.

`src/lib/release-links.ts`

- `candidatePlatformHrefs()` cap raised from `.slice(0, 3)` to `.slice(0, 8)`, which
  fixes E2E item 1.2 (3 verified links reported instead of 4+).

`src/app/api/health/db/route.ts` (new)

- Read-only `GET` diagnostic (SELECT only, admin session or detector bearer token)
  returning `{ ok, stage, provider, connection: { host, endpoint, pooled }, kind,
  latencyMs, error }`. `window.localStorage` is not involved; nothing is mutated.

`scripts/neon-connection-path-contract-test.ts` (new) + package script
`neon:connection-path-contract-test`.

## Required production configuration

In the Cloudflare Worker (`radarsite-staging`) environment, `DATABASE_URL` must be
the **Neon pooled** connection string:

```
postgresql://<user>:<pass>@ep-<id>-pooler.<region>.aws.neon.tech/<db>?sslmode=require
```

Not the direct `ep-<id>.<region>.aws.neon.tech` host, and not a custom domain.
Set via `wrangler secret put DATABASE_URL` (or the Workers dashboard
Settings → Variables and Secrets). The code now auto-normalizes a direct host to
`-pooler`, but the secret should still be corrected so the deployed value is
auditable.

## Not done here

No deploy, no migration, no push to `main`. The change is in the working tree only.
