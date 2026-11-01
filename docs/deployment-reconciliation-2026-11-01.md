# Deployment reconciliation audit & Phase 2 (2026-11-01 — Vibe agent)

Written by the Vibe agent on behalf of the user as a dated ledger entry in the spirit of
`HANDOFF.md` (following `docs/staging-retrace-2026-10-28.md`); fold into `HANDOFF.md` when
that ledger is next updated. Baseline: `main` @ `d54e015` (PR #36 merge). The initial audit was
strictly read-only; the user then approved Phases 2-4 of the reconciliation plan. This branch
(`reconcile/cloudflare-content-store`) is Phase 2. No production surface, DNS, database, or
Vercel project was changed.

## Deployment facts verified in this session

- **radarcharts.net (live production, Vercel project #1 "radarsite")** — probed 2026-11-01: the
  homepage still renders the four legacy WordPress imports (Gande "INSTA BABE", Kingx Vibe Beat
  "ONE VOICE", Rhia Bello "DRINK UP", Biyo Cin Cera "BOILING POINT"), several with "Image
  unavailable" media cards, plus the pre-events-ticker EditorialTree header ("RADARArticles✳").
  This proves the deployment serving the domain predates the 2026-10-26 provenance hotfixes
  (PR #34 `4e3a298`, PR #35 `7aed49c`) and/or its CMS store still holds legacy-stamped records.
  Which Vercel deployment/commit is live could NOT be verified (no Vercel access in this
  session) — owner should confirm in the Vercel dashboard before the cutover plan is executed.
- **radar-site-hazel.vercel.app (Vercel project #2, new Vercel account, same repo)** — probed
  2026-11-01: runs the NEWER build. Its homepage renders no EditorialTree at all — the store it
  reads contains only legacy records, which `selectFeaturedPipelineRecords()` +
  `isOriginalEditorialRecord()` correctly exclude, and EditorialTree returns null on an empty
  feed (by design). The featured-articles feature is not "lost" on the new build — it is starved
  of homepage-eligible (notion/radarsite/studio) content. Its hero ticker carries the custom
  Studio overrides ("Music is life itself…|#stayAKT!V|Protect The Music, Fans & Brands, Always."),
  confirming that deployment's store carries site settings.
- **Cloudflare Workers staging (`radarsite-staging`)** — no workers.dev URL or deploy evidence
  exists in the repo (confirmed again); `npm run build:vinext` has never run in CI. The user's
  beloved "smooth" deployment is radar-site-hazel.vercel.app (Vercel), NOT Cloudflare.
- **Root `CNAME` file (radarcharts.net, commit 2c3b2ade)** — GitHub Pages convention, used by
  nothing in this stack. Orphan candidate; remove only with owner confirmation.
- Notion publishing remains disabled everywhere (no Notion env vars in any documented
  environment; the supplied `RADAR_NOTION_DATA_SOURCE_ID` was inaccessible to the connected
  Notion account and must be re-verified by the workspace owner).

## Phase 2 changes on this branch

1. `cloudflare.config.ts` — the response-store cache adapter now builds with
   `worker: "radarsite-staging"` to match the deployed Worker name (was `radarsite`; retrace
   open item 3). Bucket unchanged.
2. `src/components/marketing/SiteFooter.tsx` — social icons now resolve through
   `canonicalSocialLabel()` (alias map: ig/insta→Instagram, twitter→X, fb→Facebook, yt→YouTube,
   case/punctuation-insensitive) with a lucide `Link2` fallback icon, so a social tile never
   renders blank when a fresh store's `socialLinks` labels don't exactly match the SOCIALS keys
   (the "missing icons" defect class).
3. `src/components/ThemeToggle.tsx` — replaced the ☼/◐ text glyphs with lucide Sun/Moon SVG
   icons; text glyphs render as missing-glyph boxes on devices whose system fonts lack them.
4. This document.

## NOT VERIFIED in this session (no Node runtime available to this agent)

- `npm run lint`, `npm run typecheck`, `npm run build`, `npm run cloudflare-content:contract-test`,
  `npm run test:editorial-feed`, and Playwright e2e were NOT executed. CI will run lint +
  typecheck + build on the PR; run the remaining contract tests before merge.
- The deployed radar-site-hazel build was not visually inspected (no browser); icon fixes are
  code-level. Visual verification on the next hazel deploy is required.

## Neon → Cloudflare content-store seeding runbook (operational, no new code needed)

The seeding path already exists in the codebase: with `RADAR_CONTENT_STORE=cloudflare` and R2
credentials set, `readContentUncached` reads the R2 content object first, and falls back to
Neon (`studio_content`) when the object is absent; the Studio API (`GET/PUT /api/studio`) then
writes the loaded content into the R2 object via `writeContentIfUnchanged` (CAS, checksummed).

1. On the staging environment (radar-site-hazel preview or the staging Worker) set:
   `RADAR_CONTENT_STORE=cloudflare` plus `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=radarsite-media`, `R2_ENDPOINT`, `R2_PUBLIC_BASE_URL`.
2. Open the Studio panel (admin), confirm it loaded the current Neon content (article counts,
   recent titles), then save once — this writes `content/radarsite-content-v1.json` to R2.
3. Verify: `npm run cloudflare-content:contract-test`, `npm run cms:diagnose` against the
   staging URL, and confirm the homepage EditorialTree now renders the homepage-eligible
   articles (only notion/radarsite/studio-stamped originals feature).

## Phase 3 — permanent Notion homepage (requires owner secrets)

After seeding, set on the same environment: `RADAR_NOTION_DIRECT_READ_ENABLED=true`,
`NOTION_API_KEY`, `RADAR_NOTION_DATA_SOURCE_ID` (owner-verified), and for the publish webhook
`RADAR_NOTION_SYNC_SECRET` + `RADAR_NOTION_PUBLISHING_ENABLED` (staging first). The homepage
then auto-reflects every newly published Notion article within ≤240s
(`PUBLIC_CONTENT_REVALIDATE_SECONDS`), and instantly on publish-route cache invalidation.
Follow docs/notion-publishing-integration.md exactly (dry-run first, one approved test article).

## Next steps (ordered)

1. Run lint/typecheck/build + the contract tests listed above on this branch; fix any findings.
2. Open/review the PR for this branch; merge only with explicit user authorization.
3. Owner: confirm in the Vercel dashboard which deployment serves radarcharts.net (commit +
   project), and whether project #2 (radar-site-hazel) tracks `main`.
4. Execute the seeding runbook on staging; verify the EditorialTree renders originals.
5. Phase 3 (Notion permanent homepage) with owner-supplied secrets; then Phase 4 cleanup
   (react-icons consolidation decision, npm audit 1 moderate/5 high, daily-site-audit.yml
   failures since Oct 16, CNAME orphan) on isolated branches.
6. Only after staging validation: plan the Vercel → Cloudflare cutover as an explicit,
   user-authorized step. Keep the Vercel production project untouched until then.

## DO NOT TOUCH

- Vercel production project "radarsite" (prj_Ntdr68Qf464bFdRMma0MZmmwyyPf), its domains, env
  vars, and deployments — production still serves radarcharts.net from it.
- DNS, Neon database, R2 buckets/objects, `public/motherland/featured.gif`, homepage Hero ticker
  configuration, and the Gande "Insta Babe" 404 imagery (per HANDOFF.md standing instructions).
- The legacy archives (/ontheradar/articles) still intentionally list legacy imports; removing
  legacy content entirely from the archives is a separate owner decision.


## PR consolidation & merge sequence (2026-11-01 — Vibe agent)

Executed under explicit user authorization ("Proceed" to the four-action plan). No branches were deleted; no DNS, production config, secrets, database or R2 changes were made.

### Merged (verified green before merge)
- PR #37 (reconcile/cloudflare-content-store) marked ready, merged to main as 5fedfe7. Pre-merge evidence: CI run #170 green (lint 0 errors / 6 warnings, typecheck, 475-page build) and Phase 2 verification run 41267314159 all green — cloudflare-content:contract-test, test:editorial-feed, and the first successful npm run build:vinext.
- PR #38 (fix/cms-image-delivery-2026-11-01) merged to main as 69849d2 (new main tip). Pre-merge evidence: CI "verify" green on head 1646c8f. Its CSP + editorial-archives contract tests are not part of ci.yml; a scoped merged-main verification workflow was dispatched on branch verify/merged-main-2026-11-01 (workflow .github/workflows/verify-merged-main.yml, commit 664bc78) running cloudflare-content:contract-test, test:editorial-feed, test:csp, test:editorial-archives and build:vinext against the merged tree — result pending at the time of this ledger entry (unverified until the run completes).

### Closed as superseded (branches retained, evidence in each closing comment)
PR #4 (PlaylistFloater), #5 (ci.yml/healthchecks), #8 (Oct 22 recovery + #34/#35), #15 (fixes in main), #18 (CAS write path, request-security.ts, 0b1bb1f), #24 (Studio overrides). PR #16 (SEO Auditor) left OPEN pending owner decision.

### Claimed PRs reconciled with updated main (main + PR changes, conflict-free)
- PR #17 (legal/privacy-terms): main merged into branch via update-branch; head feabf64; mergeable_state clean; CI verify green.
- PR #26 (editorial-network-intake): three-step reconciliation on the branch (align shared files to main 9a2cafd -> merge main in 4f7372a -> re-apply PR changes 83fa66af). Net effect: package.json gains intake/media-manifest/receipt contract-test scripts; HANDOFF.md intake ledger section preserved; all seven new lib/script files untouched. Mergeable; CI in progress at time of entry. The three new contract tests have not been executed in CI (not part of ci.yml) — run them before merging this PR.
- PR #19 (feat/zumzy-brown-legacy-memorial): same three-step reconciliation (ad1e865 -> 4e08d9d -> 1f121f3). Net effect: /legends/zumzy-brown sitemap route, PlaylistFloater aria-hidden label, ShareActions clipboard fallback + focus-visible styles; all nine new legend files untouched. Mergeable; CI in progress at time of entry.
