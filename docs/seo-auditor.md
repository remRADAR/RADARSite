# RADAR SEO Authority Auditor

An integrated, explainable SEO auditing engine for RADARSite. It analyzes the
CMS content graph (and, when available, the live rendered page) and produces a
transparent scorecard with findings, evidence and recommended fixes.

The auditor is **read-only**: it never publishes, edits or deletes content, and
never modifies production SEO directives. Scores measure conformance with this
project's own standards — they are **not** a Google ranking factor and must not
be presented as one.

## Components

| Path | Purpose |
| --- | --- |
| `src/lib/seo-audit/types.ts` | Finding, scorecard and report types |
| `src/lib/seo-audit/url-validation.ts` | Audit-target validation and SSRF protection |
| `src/lib/seo-audit/html-analysis.ts` | Dependency-free HTML analysis helpers |
| `src/lib/seo-audit/score.ts` | Scoring methodology |
| `src/lib/seo-audit/entity-readiness.ts` | Music-entity readiness (RADARMatrix groundwork) |
| `src/lib/seo-audit/audit-engine.ts` | The audit engine (pure; no network I/O) |
| `src/lib/seo-audit/live-fetch.ts` | Bounded, site-only live fetching |
| `src/lib/seo-audit/storage.ts` | Persistent audit history (`seo_audit_runs`) |
| `src/app/api/admin/seo-audit/*` | Authenticated admin API routes |
| `src/components/admin/SeoAuditPanel.tsx` | CMS audit dashboard |
| `scripts/seo-audit-contract-test.ts` | Contract tests (`npm run test:seo-audit`) |

## Scoring methodology

Every scored category starts at 100 and loses points per finding:

| Severity | Penalty | Meaning |
| --- | --- | --- |
| critical | -25 | Actual technical failure or factually wrong output |
| warning | -10 | Meaningful quality gap or missing important field |
| recommendation | -3 | Improvement opportunity (not a failure) |
| info | -0 | Noted for future readiness; no score impact |

Overall score = weighted mean of five categories:
**technical 30% · metadata 25% · structured data 15% · internal links 15% · editorial 15%**.

`music-entities` and `sources` findings are readiness indicators and do not
reduce the overall score yet. A populated field alone never earns points: checks
evaluate validity, consistency and suitability. Scores are floored at 0 and
capped at 100.

## What is audited

- **Technical**: HTTP status, redirects, canonical presence/consistency (live
  and CMS field), noindex conflicts, mixed content, image alt text, responsive
  image hints, H1 usage, heading-hierarchy skips. (Live checks require the
  live fetcher; without it the engine says so in `notes`.)
- **Metadata**: title presence/length/case/uniqueness, description
  presence/length/uniqueness, canonical field vs route, social image.
- **Structured data**: JSON-LD syntax validity, known @type, Article required
  properties (headline, author, dates, image), contradictory dates. Only
  schema that accurately describes the page is recommended; nothing is
  invented.
- **Internal links**: broken internal links (against the CMS + static route
  graph), orphaned content (CMS body-link graph only), malformed external
  links.
- **Editorial**: thin content, missing author/date/excerpt/taxonomy, stale
  content, near-duplicate body content. Arbitrary keyword density is
  deliberately **not** used.
- **Music entities**: documented entity fields (`sourceArtistName`,
  `sourceSongName`, `sourceReleaseName`) are treated as facts; body-text name
  co-occurrence is only ever reported as an **unverified candidate** requiring
  editorial confirmation. Link opportunities to matching artist/release pages
  are recommended, not applied.
- **Sources**: missing source URLs on press-like records, malformed source
  URLs, duplicate references. A citation is never treated as verification of
  the cited claim.

## Safety model

- Audit targets are restricted to `radarcharts.net` / `www.radarcharts.net`
  over HTTPS; private ranges, loopback, link-local, cloud metadata endpoints,
  credentials, odd ports and admin paths are rejected.
- The engine performs **no network I/O**; live fetching is injected, bounded
  (8s timeout, one retry, 2 MB body cap) and site-origin only.
- Max 10 URLs per scan; per-IP rate limit of 20 scan requests/minute.
- All endpoints require the Studio admin session cookie and same-origin
  mutations, matching existing admin API conventions.
- The auditor does not fetch external sites; external URLs are syntax-checked
  only.

## API

All routes are admin-authenticated and `Cache-Control: no-store`.

### `POST /api/admin/seo-audit`
Request: `{ "urls": string[] }` (1–10 site URLs or paths)
- `200` `{ "success": true, "persisted": boolean, "reports": AuditReport[] }`
- `400` `{ "success": false, "error" }` or `{ "success": false, "errors": [{ "input", "error" }] }`
- `401` unauthenticated · `403` cross-origin · `429` rate limited

### `GET /api/admin/seo-audit?path=&severity=&category=&limit=`
- `200` `{ "success": true, "persisted": boolean, "runs": AuditRunRow[] }`

### `POST /api/admin/seo-audit/resolve`
Request: `{ "runId", "findingId", "status": "open"|"resolved"|"wont-fix" }`
- `200` `{ "success": true }` · `404` unknown run/finding

### `GET /api/admin/seo-audit/export?path=&format=csv|json`
- `200` downloadable report · `404` nothing stored

## Storage

One new table, created lazily via the project's `CREATE TABLE IF NOT EXISTS`
convention (same pattern as `studio_settings`):

```sql
CREATE TABLE IF NOT EXISTS seo_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  path text NOT NULL,
  content_type text NOT NULL,
  audited_at timestamptz NOT NULL DEFAULT now(),
  audit_version text NOT NULL,
  status text NOT NULL,
  live_fetch boolean NOT NULL DEFAULT false,
  scores jsonb NOT NULL,
  findings jsonb NOT NULL,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS seo_audit_runs_path_idx ON seo_audit_runs (path, audited_at DESC);
```

No environment variables are added. When `DATABASE_URL` is unset, audits still
run and return reports, but history is session-only (`persisted: false`).

## Future extension points

- **RADARMatrix / SongDNA**: `entity-readiness.ts` separates verified
  documented fields from unverified candidates, ready to feed a knowledge
  graph without polluting it with guesses.
- **RADAR Reference Intelligence**: `sources` findings already cover missing,
  malformed and duplicate references; the `AuditFinding` shape can carry
  claim-level evidence IDs when claim provenance lands.
- **Automatic fixes**: findings carry `autoFixable` (currently always
  `false`); a preview-and-approval flow can be built on it without schema
  changes.
- Core Web Vitals: the live fetch result can be extended with lab data when a
  measurement provider is authorized; no such API is assumed today.
