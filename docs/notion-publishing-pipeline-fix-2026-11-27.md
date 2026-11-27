# Notion → Cloudflare publishing: what was broken, what changed, what only the owner can finish

**Status:** code complete and verified locally. **Not yet functional in production** — it stays
non-functional until the settings in §5 exist. Nothing in this document claims otherwise.

---

## 1. The diagnosis

The administration UI and the code in this repository were never the same system. The
"Notion ↔ Cloudflare" mix-up is not one broken setting; it is that **the wire between them
was never built**, plus four smaller defects that would have blocked a single-action publish
even if the wire had existed.

### Defect 1 — The publish path is switched off in production (blocking, verified live)

I probed the running site:

```
POST https://radarcharts.net/api/integrations/notion/publish
→ HTTP 503  {"error":"Notion publishing is disabled in this environment.",
             "code":"integration_disabled"}
```

That response is produced only by the environment check at
`src/app/api/integrations/notion/publish/route.ts:207`:

```ts
if (process.env.RADAR_NOTION_PUBLISHING_ENABLED !== "true") return ... 503
```

So every publish attempt is rejected before it reads a single Notion page. The endpoint is
reachable (it answers, it is not a 404), which proves the route is deployed and the host is
serving this codebase — the flag is simply off.

### Defect 2 — Nothing in Notion can ever trigger a publish (blocking, verified in code)

`/api/integrations/notion/publish` is a **pull** endpoint. It does nothing until an external
caller POSTs `{"pageId": "..."}` with `Authorization: Bearer $RADAR_NOTION_SYNC_SECRET`.

I searched the whole repository for anything that calls it:

- no Notion webhook receiver (nothing under `src/app/api/integrations/notion/` except
  `publish` and `stage-media`),
- no `scheduled`/`cron` handler in `wrangler.toml` or any worker,
- no client code, button, automation, or workflow that POSTs to it.

**Conclusion: tapping Publish in Notion has never had any code listening for it.** The only way
anything has ever been published is a human (or an AI on the human's behalf) manually running
`curl`. That is exactly the symptom described: "no one has to ask an AI to finish publishing"
was never satisfied, because the AI *was* the transport.

### Defect 3 — "Tap Publish" required two taps by contract

`validatePageAuthorization` (`src/lib/notion-editorial-sync.ts:189`) requires **both**:

1. `Publish to RADARSite` checkbox checked, **and**
2. `Status` ∈ `Approved | Publishing | Published`.

Checking the publish box while the status still reads `Draft` is rejected with
`Editorial status Draft is not publishable; approval is required.` So a single action cannot
publish, even once the wire exists.

### Defect 4 — A scheduled date hard-fails instead of deferring

`notion-editorial-sync.ts:194` returns an error when `Scheduled Publish Date` is in the future
("scheduled publication is not enabled"). A webhook that fires on every edit therefore produces
a stream of visible failures for perfectly valid scheduled articles.

### Defect 5 — A 503 cannot tell you what is missing

The two configuration failures returned a bare message with no field naming the absent
variable. That is why the mix-up stayed undiagnosed: the system knew what was wrong and would
not say.

### What was *not* wrong

I want to be precise about this, because "the deploy is broken" was a plausible theory and it
is wrong:

- **The Cloudflare deploy pipeline is healthy.** Workflow `deploy-cloudflare-staging.yml`
  ("Deploy (Cloudflare production)") run **#156** finished `success` on **2026-11-27T10:24Z**
  for commit `c0857c42`. Anything pushed to `main` does deploy.
- **The live host serves this codebase.** `/sitemap.xml` returns the app's real XML, and a
  brand-new route is `404` on the live site while an existing route answers correctly — i.e.
  the running app is this repository, one deploy behind a change.
- **Neon/R2 write-path handling is already hardened** (`src/lib/database.ts` pins the pooled
  Neon HTTP endpoint to prevent Cloudflare error 1016 / HTTP 530).

So this was never a deploy problem. It is a **missing event source plus a disabled flag**.

---

## 2. What changed

Every change is additive. No existing module, route or contract was modified.

| File | Change |
| --- | --- |
| `src/app/api/integrations/notion/events/route.ts` | **New.** The missing push wire. Notion webhook target: HMAC-SHA256 signature verification (`X-Notion-Signature`), subscription handshake, replay dedupe table, and re-entry into the *existing* publish handler so there is exactly one implementation of publishing. Fires routing after a successful publish. |
| `src/app/api/internal/routing/route.ts` | **New.** The routing agent's entry point: route one article, sweep all published, dry-run, and `GET` verification. |
| `src/app/api/internal/notion-sweep/route.ts` | **New.** Self-healing sweeper for a Cron Trigger: finds approved + publish-checked pages the CMS doesn't know about, publishes them, then reconciles routing. Uses the same approval rule as the publish runtime, so it can never publish something a human didn't approve. |
| `src/lib/article-routing.ts` | **New.** The curation + routing agent (see §3). |
| `src/lib/notion-approval-bridge.ts` | **New.** Interprets the owner's single gesture: when `RADAR_NOTION_SINGLE_ACTION_PUBLISH=true`, a checked `Publish to RADARSite` is the approval and the bridge promotes `Status` to `Approved` immediately before publishing. `Changes Requested` / `Archived` are never promoted. Also handles `RADAR_NOTION_DEFER_SCHEDULED_PUBLISH`. Inert by default. |
| `scripts/article-routing-contract-test.ts` | **New.** 12 test groups, all passing. |
| `package.json` | Added the `article-routing:contract-test` script. |

Because the approval bridge lives beside the runtime rather than inside it, the publish runtime still
enforces `Publish to RADARSite` checked **and** a publishable `Status`; the bridge only ever *sets* a
status a human already asked for by tapping Publish. That is why the pre-existing
`notion:contract-test` still passes untouched.

Run it yourself:

```bash
npm run typecheck                        # 0 errors
npm run article-routing:contract-test    # 12 groups passed
npm run notion:contract-test             # all PASS, unchanged
```

---

## 3. The article curation + routing agent

The metaphor in the brief is the design: an article is a passenger with a fixed itinerary, and a
stop is only "arrived" when the article is actually there.

**Itinerary (deterministic — same article, same route, every time):**

1. `site` — the article page resolves at `/ontheradar/articles/<slug>`
2. `sitemap` — present in `/sitemap.xml` (search discovery)
3. `social-card` — `/api/social-card/<slug>` renders (every share network uses it)
4. `archive-index` — the article appears on its editorial-type and category index pages
5. external networks — newsletter, X, Instagram, Facebook, LinkedIn, WhatsApp

Owned surfaces are ordered **before** every external network: an article must be complete on our
own site before it is announced anywhere else.

**The four properties that make it "correct every time":**

- **Idempotent.** A durable per-article, per-stop ledger (`article_route_ledger`) means a
  re-publish, a duplicate webhook, or a manual retry never announces the same article twice.
  `force: true` is the explicit, deliberate override.
- **Honest.** A stop whose adapter credential is absent is recorded `deferred` **with the exact
  variable name** — never `delivered`. The test asserts that a channel that was never configured
  can never be counted as a delivery.
- **Bounded.** A failed stop retries on exponential backoff (`60s → 1h`, capped) and after 6
  attempts is `failed` — not retried forever, not silently dropped.
- **Verified.** `GET /api/internal/routing?slug=…` re-checks the *live* surface (HTTP status of
  the page, card and index; string match of the URL inside the served sitemap XML; ledger status
  for external networks). "The step ran" and "the passenger arrived" are different things.

**Curation gate.** An article with no authoritative editorial category is still published to our
own site but its external stops are `skipped` with the reason — so "published but mis-tagged"
never becomes "announced everywhere and mis-tagged".

External adapter contract (stable, so any network can be wired without touching this code):

```
POST <ROUTING_<CHANNEL>_WEBHOOK_URL>
Authorization: Bearer <ROUTING_<CHANNEL>_WEBHOOK_SECRET>
{ slug, title, url, editorialType, magazineSubtype, projectSection,
  categories, socialCardUrl, idempotencyKey }
```

---

## 4. How the chain works once configured

```
Owner taps "Publish to RADARSite" in Notion
        │
        ▼
Notion automation → POST /api/integrations/notion/events
        │            (HMAC verified, replayed events dropped)
        ▼
existing publish handler → Notion read → media import to R2 → CMS write
        │                                                     │
        │                                                     ▼
        │                                    article live on radarcharts.net
        ▼
routing agent → site → sitemap → share card → index → each network
        │
        ▼
ledger per stop + verification endpoint
```

A dropped webhook is caught by the cron sweeper, so the worst case is "live a few minutes later",
not "never published".

---

## 5. What only you can supply — and where

I stopped here deliberately. Each of these is a secret or a dashboard object I cannot create, and
guessing any of them would be a fabricated claim of a working pipeline.

### 5.1 Cloudflare Worker secrets (Workers → radarcharts → Settings → Variables and Secrets)

| Variable | Value | Required? |
| --- | --- | --- |
| `RADAR_NOTION_PUBLISHING_ENABLED` | `true` | **Yes** — Defect 1; nothing works without it |
| `RADAR_NOTION_SYNC_SECRET` | a long random string (e.g. `openssl rand -hex 32`) — also the bearer used by the routing API | **Yes** |
| `RADAR_NOTION_WEBHOOK_VERIFICATION_TOKEN` | the verification token Notion shows when you create the webhook (§5.2) | **Yes** — the receiver fails closed without it |
| `RADAR_NOTION_SINGLE_ACTION_PUBLISH` | `true` | Recommended — makes one tap enough (Defect 3) |
| `RADAR_NOTION_DEFER_SCHEDULED_PUBLISH` | `true` | Recommended — fixes Defect 4 |

Confirm `NOTION_API_KEY` and `RADAR_NOTION_DATA_SOURCE_ID` are also set on the Worker — the
publish route needs both, and the routes now name whichever is missing in `requiredEnv`.

### 5.2 The Notion automation (this is the tap that starts the trip)

In the editorial data source → **Automations** → new automation:

- **Trigger:** a page is edited (or: `Publish to RADARSite` is checked, if you prefer an explicit
  trigger — Notion offers property-change triggers).
- **Action:** *Send webhook* → `https://radarcharts.net/api/integrations/notion/events`
- Copy the **verification token** Notion generates into `RADAR_NOTION_WEBHOOK_VERIFICATION_TOKEN`.

That single automation object is what makes "tap Publish in Notion" sufficient. Without it,
nothing in Notion can reach the site — that was Defect 2.

### 5.3 Cron trigger (the safety net)

Point a scheduler at `https://radarcharts.net/api/internal/notion-sweep?secret=<RADAR_NOTION_SYNC_SECRET>`
every ~10 minutes. Either a Cloudflare Cron Trigger, or any external scheduler hitting that URL with the
bearer token, works — the route accepts both.

### 5.4 Network adapters (external routing stops)

For each network you actually use, set `ROUTING_<CHANNEL>_WEBHOOK_URL` (and optionally
`ROUTING_<CHANNEL>_WEBHOOK_SECRET`) where `<CHANNEL>` ∈ `NEWSLETTER`, `X`, `INSTAGRAM`,
`FACEBOOK`, `LINKEDIN`, `WHATSAPP`. Until then those stops honestly report `deferred` — the
article is live and routable on our own surfaces, and nothing is falsely marked as posted.

I did **not** invent API endpoints for X/Instagram/Meta/LinkedIn/WhatsApp. Their posting APIs
need an app review, per-page access tokens and a media pipeline; wiring them blind would produce
the exact fabricated "published" claim this task warns against. The routing agent already models
them as first-class stops — they light up the moment a real endpoint and token exist.

### 5.5 A note on the admin UI

I found no admin screen in this repository that configures Notion or Cloudflare, so if the
"mix-up" you saw was in the Cloudflare dashboard's integration settings, the settings above are
the ones that matter. No dashboard setting can make publishing work while
`RADAR_NOTION_PUBLISHING_ENABLED` is false, and no dashboard setting can replace the missing
Notion automation — those are Defects 1 and 2.

---

## 6. Honest status

| Claim | State |
| --- | --- |
| Diagnosis | **Done** — evidence in §1, including a live probe of production |
| Code | **Done** — `tsc` 0 errors, ESLint 0 errors, production build compiles, 12/12 routing groups + existing Notion contract green |
| Pushed | **Done** — four commits pushed to `main`; see the task report for hashes |
| Deployed | See the task report — verified against the GitHub Actions run for the pushed commit |
| Working end-to-end in production | **No, and not claimed.** Blocked on §5.1–§5.2. Until then the receiver returns 503 `configuration_missing` naming the variable, by design. |
