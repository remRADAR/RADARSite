# Live verification — Notion images on RADARSite

**Checked:** 2026-11-27, ~16:10–16:45 UTC, against `https://radarcharts.net`
**Commits pushed:** `12d38b5`, `ff23fd9` (both on `main`)
**Deploys:** both succeeded (Cloudflare production workflow)

---

## Verdict

**The engine is built, tested, pushed and deployed. The two articles are still broken.**

The code that prevents and repairs temporary Notion image links is live. But the
repair has **not run**, because the production environment has Notion publishing
switched off. So the two articles still serve expired Notion URLs, and those
images return **HTTP 403**.

---

## Evidence — what the live site actually serves

### Article 1 — `david-acekeyz-the-journey-17-track-debut-album`

| Check | Result |
|---|---|
| Page loads | **200**, 64,436 bytes |
| Temporary Notion `<img>` in body | **3 distinct** (hero + 2 inline) |
| Images served from our R2 storage | **0** |
| Hero image HTTP status | **403** |
| Homepage featured image | temporary Notion URL, **403** |

Stored URLs found in the live HTML:

```
https://prod-files-secure.s3.us-west-2.amazonaws.com/9ee58434-.../608af7ee-.../D8257CA4-....webp
https://prod-files-secure.s3.us-west-2.amazonaws.com/9ee58434-.../256ba097-.../C9DA62CD-....webp
https://prod-files-secure.s3.us-west-2.amazonaws.com/9ee58434-.../a1fe954e-.../C98BBA77-....webp
```

The page's own structured data even labels it:
`"caption":"Temporary featured-image placeholder for David Acekeyz and The Journey album artwork"`

### Article 2 — `eze-a-new-name-a-deeper-connection-and-a-return-to-music`

| Check | Result |
|---|---|
| Page loads | **200**, 101,049 bytes |
| Temporary Notion `<img>` in body | **1 distinct** (repeated 4×) |
| Images served from our R2 storage | **0** |
| Image HTTP status | **403** |
| Homepage featured image | temporary Notion URL, **403** |

```
https://prod-files-secure.s3.us-west-2.amazonaws.com/9ee58434-.../2111475e-.../02D8B30B-....webp
```

### Homepage

`https://radarcharts.net/` contains **exactly 2** `prod-files-secure` references —
one for each of these two articles' featured images. Both are the broken ones.
Every other card on the homepage uses a working local or R2 asset.

### Open Graph / social cards

`og:image` and `twitter:image` on both articles point at
`/api/social-card/<slug>?v=2` — our own endpoint, **not** Notion. These are fine.

---

## Why the repair has not run

The deployed endpoints answer:

```
POST /api/internal/notion-image-repair
  -> 503 {"error":"Notion publishing is disabled in this environment.",
          "code":"integration_disabled"}

POST /api/internal/notion-sweep
  -> 503 {"error":"Notion publishing is disabled in this environment.",
          "code":"integration_disabled"}

GET  /api/internal/notion-image-repair
  -> 401 (auth works; the route is live)
```

`RADAR_NOTION_PUBLISHING_ENABLED` is not `"true"` in production. Both the manual
repair and the automatic sweep are gated behind it, so neither can run.

**This is the one thing blocking the fix, and it is an owner-only setting.**

---

## What was built and shipped

| File | Change |
|---|---|
| `src/lib/notion-image-hygiene.ts` | **New.** Detects temporary Notion image URLs (current host, legacy `notion-static` hosts, `/secure.notion-static.com/` path form), finds them in HTML, rewrites them, and reports anything unresolvable instead of dropping it. |
| `src/lib/notion-image-repair.ts` | **New.** The repair engine. Matches an expired stored URL to a freshly signed Notion URL by stable identity (`origin + pathname`), with positional fallback. |
| `src/lib/notion-image-backfill.ts` | **New.** Shared backfill used by both the manual endpoint and the cron sweep. Idempotent, compare-and-swap writes, never writes a partial repair. |
| `src/app/api/internal/notion-image-repair/route.ts` | **New.** `POST` repairs, `GET` inventories. Bearer auth. |
| `src/app/api/internal/notion-sweep/route.ts` | Repairs temporary image URLs on every sweep pass — the self-healing path. |
| `src/app/api/integrations/notion/publish/route.ts` | **Hard gate:** refuses to return a record still containing a temporary URL (`502 temporary_notion_image_url`). |
| `src/app/api/studio/route.ts` | **Hard gate:** rejects a `published` article carrying a temporary URL (`422`). Drafts still pass. |
| `src/lib/notion-editorial-sync.ts` | Added `collectNotionImageSources` — gathers every image with a currently valid signed URL. |
| `scripts/notion-image-hygiene-test.ts` | **New.** 30+ contract assertions. |
| `docs/notion-image-permanence-2026-11-27.md` | **New.** Design + operating notes. |

**Verified locally:** `tsc --noEmit` clean, `eslint` clean, new contract test
passes, existing `notion:contract-test` still passes all 25 checks.

---

## What the owner must supply

1. **`RADAR_NOTION_PUBLISHING_ENABLED=true`** in the production environment
   (Cloudflare dashboard → the RADARSite Worker → Settings → Variables).
   Without it, nothing can repair or publish.
2. **`NOTION_API_KEY`** — needed to re-read the pages and get fresh signed URLs.
   The stored URLs have already expired, so the images cannot be recovered
   without re-reading Notion.
3. **R2 configuration** — `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL`. The public base URL is already
   in use on the site (`pub-2d7f41f7140544c480801d8b90da765e.r2.dev`), so this
   is likely already set.
4. **`RADAR_NOTION_SYNC_SECRET`** — to call the repair endpoint.

Once those are set, one call fixes both articles:

```bash
curl -X POST -H "Authorization: Bearer $RADAR_NOTION_SYNC_SECRET" \
  -H "content-type: application/json" -d '{}' \
  https://radarcharts.net/api/internal/notion-image-repair
```

After that, every future article is covered automatically by the sweep.

---

## RADARMatrix

There is **no agent named RADARMatrix** in this group (41 members checked). The
closest names are `RADARMe` (human) and `radarmusicbyradarcharts` (human).

Nothing has been wired to RADARMatrix, because there is nothing to wire to yet.
The engine exposes a clean, documented interface that any agent can call:

- `GET /api/internal/notion-image-repair` — inventory of broken records
- `POST /api/internal/notion-image-repair` — repair (supports `dryRun` and `slugs`)
- `POST /api/internal/notion-sweep` — publish + route + repair in one pass

**Needs a decision:** which agent is RADARMatrix, and should it be given the
`RADAR_NOTION_SYNC_SECRET` to call these endpoints?

---

## Note on the failed verification workflow

The `Verify production editorial routes` run on `ff23fd9` reported **failure**.
That is **not** a code defect: the script probes every article route at
concurrency 6, and production returned `503` on a large batch. Re-running the
same script locally at concurrency 3 reproduced the same `503` pattern, and the
two target articles return `200` when fetched individually after a pause. This
is origin rate-limiting under a burst of uncached renders, which the script's
own comment warns about. It is a pre-existing monitoring characteristic, not
something these commits introduced.
