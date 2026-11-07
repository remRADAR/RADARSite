# HANDOFF — RADARSite (radarcharts.net)

## CTA globe transparent surface fix (2026-11-07 — Vibe agent)

Branch `fix/homepage-cta-transparent-surface` (from main @ 0399f528, head fc4c541 + this ledger commit), PR #40. Owner instruction: fix the homepage (05) Start CTA segment "with the most recent build that implemented the background removal and having the GIF with a transparent background and moving" (screenshot IMG_5725.PNG: mobile, gray section, dotted globe, frozen).

Diagnosis (verified, read-only):
- The background-removal build IS on main and deployed: commit `c7624323` "fix: add resilient transparent CTA globe" (2026-10-26) is the latest commit touching CTASection.tsx / CTASection.module.css; production radarcharts.net serves a current main build (live /privacy and /terms routes from the 2026-11-06 PR #17 merge; 2026-11-03 editorial priority copy live).
- The gray in the owner's mobile screenshot is the DELIBERATE mobile backdrop `--cta-globe-background-mobile: #737373` (desktop painted #080808) in CTASection.module.css — it makes the segment look like the retired full-bleed gray homepage-cta.gif, i.e. like the background removal never happened.
- The frozen globe is the by-design poster path: CTASection swaps the animated GIF for homepage-cta-globe-poster.png when `prefers-reduced-motion: reduce` (also on load failure). The owner was unsure whether iPhone Reduce Motion is enabled; that device setting, not a code defect, is the most likely cause of the freeze. The GIF asset (public/media/homepage-cta-globe-transparent.gif, 2,230,991 bytes) is distinct from the retired gray full-bleed homepage-cta.gif (2,701,380 bytes) and was NOT touched.

Change (this branch):
- `src/components/marketing/CTASection.module.css` — both painted backdrops removed: .section paints var(--paper) (the site surface, #050505 dark theme) and .globeStage is fully transparent at every viewport; the mobile media query keeps only layout rules. The transparent animated GIF now floats directly on the dark section surface on desktop AND mobile.
- `tests/e2e/homepage-cta-globe.spec.ts` — first test renamed "loads the local transparent globe on the section surface at every viewport"; now asserts the stage backdrop is rgba(0, 0, 0, 0), the section background is identical at desktop and 390x844, and the retired rgb(115, 115, 115) gray never returns. Poster-failure and reduced-motion tests unchanged.

NOT VERIFIED in this session (no Node runtime): npm run lint, npm run typecheck, npm run build, and the Playwright suite were NOT executed. PR CI runs the Phase 2 contract tests + build:vinext; the e2e suite is NOT part of CI — run `npm run test:e2e -- tests/e2e/homepage-cta-globe.spec.ts` on a checkout before/after merge.

Owner follow-ups:
1. Check iPhone Settings > Accessibility > Motion > Reduce Motion: when on, the site intentionally shows the static poster instead of the animation. Forcing animation for reduced-motion users would be an accessibility regression and needs an explicit owner decision.
2. To confirm the deployed asset plays standalone: open https://radarcharts.net/media/homepage-cta-globe-transparent.gif directly in Safari.
3. Four Vercel projects auto-deploy main pushes; after merge, hard-refresh production to bypass cache and confirm the globe animates on the dark surface.

---

## Homepage featured pipeline: new originals only (2026-10-26 — Vibe agent)

MERGED: PR #34 (branch `homepage-featured-pipeline`) merged to main as `4e3a298` on 2026-10-26 with explicit user authorization ("Merge now — deploy to production"), after full branch validation. Production deploy via Vercel followed automatically.

Problem: the homepage Editorial Tree (`getRecentEditorialPosts` in `src/lib/editorial-tree.ts`) selected from ALL published articles regardless of provenance, so legacy WordPress/CMS imports from the merged content snapshot (and any stale Neon/Cloudflare seed of it) kept appearing in the homepage featured pipeline — exactly the "steady issues" seen around the Neon upgrade.

Fix (source-provenance discrimination):
- `src/lib/editorial-archives.ts` — added `isOriginalEditorialRecord()`: true for `sourceProvider` "notion" (Notion editorial pipeline, set by content-server direct read), "radarsite" (Studio panel publications, set by CmsStudioPanel), "radarcharts" (the live Cloudflare content store's current/historical Studio marker), or "studio" (defensive). Legacy imports carry "legacy"/no provider and are excluded.
- `src/lib/editorial-tree.ts` — added `selectFeaturedPipelineRecords()` (pure, exported): filters to new originals then applies the existing selection (featured-first, newest-first, draft/archived excluded, limit). `getRecentEditorialPosts()` — the homepage's only article feed — now uses it. Destination URLs remain `articlePath()` = /ontheradar/articles/&lt;slug&gt;, the archive home for Notion + Studio originals.
- `scripts/homepage-featured-pipeline-contract-test.ts` (+ `npm run homepage:featured-pipeline-contract-test`): asserts Notion/Studio originals pass the filter, legacy/unmarked records never do, generic editorial selection (archive behaviour) is unchanged, featured-first ordering, limit-after-filter, and that a legacy-only catalogue yields an empty homepage tree (EditorialTree renders nu
ll when empty — graceful).

Scope boundaries: archive pages (/ontheradar/articles, press/spotlight listings, article detail routes) were NOT changed — legacy articles remain reachable there. Removing legacy imports from the archives/site entirely is a separate decision awaiting explicit authorization.

VERIFIED before merge (user-run validation on the branch, working tree clean): npm install OK (1,034 packages); `npm run homepage:featured-pipeline-contract-test` PASSED (legacy excluded, Notion + Studio originals featured, featured-first ordering); `npm run test:editorial-feed` PASSED (incl. legacy homepage exclusion); `npm run test` PASSED (ESLint 0 errors / 6 warnings, typecheck clean); `npm run build` PASSED (475 static pages). Pre-existing npm audit findings (1 moderate, 5 high) were not addressed here.

NEXT STEPS:
1. Run the contract test + lint/typecheck/build on the branch.
2. Verify the live CMS source (Cloudflare store / Notion direct read) actually carries sourceProvider on Studio articles; if the Studio write path ever drops the field, the homepage will treat them as legacy — the contract test guards the selector, but verify one real published Studio article on a preview deployment.
3. Merge + deploy only with explicit user authorization.

---


## HOTFIX: homepage pipeline accepted WordPress imports via the "radarcharts" marker (2026-10-26 — Vibe agent)

**RESOLVED (2026-10-26):** PR #35 merged to main as 7aed49c, following the user report that production still showed legacy CMS articles without featured images (screenshot IMG_5407.PNG). Vercel production deploy auto-triggered. Live fetch ~10 min post-merge still returned the pre-hotfix build (legacy Gande/Kingx/Rhia/Biyo with "Image unavailable"); the 475-page production build takes several minutes, so re-fetch to confirm the homepage tree now shows only Notion + Studio originals (or renders nothing if none are published — by design).

Production evidence (user screenshot IMG_5407.PNG + live HTML of radarcharts.net): the homepage Editorial Tree featured legacy WordPress articles — Gande "INSTA BABE", Kingx Vibe Beat "ONE VOICE", Rhia Bello "DRINK UP", Biyo Cin Cera "BOILING POINT" — two rendering "Image unavailable".

Root cause: `scripts/cms-reconcile.ts` imports the WordPress archive from radarcharts.net (wp-json) with `sourceProvider: "radarcharts"` (see `importWordPressArchive`/`toRecord` in `src/lib/editorial-migration.ts` — the provider comes from the migration source, and the default reconcile source is "radarcharts"). The earli
er provenance commit accepted "radarcharts" as a "live Studio store marker" — a misdiagnosis: "radarcharts" is exclusively the WordPress IMPORT marker, so every imported WordPress post passed `isOriginalEditorialRecord()` and featured on the homepage. Genuine Studio publications are stamped "radarsite" by the studio API route (`defaultArticle()`); Notion articles are stamped "notion" by the content-server direct read.

Fix (branch `fix/homepage-pipeline-provenance`):
- `src/lib/editorial-archives.ts` — `isOriginalEditorialRecord()` now accepts only "notion", "radarsite", "studio". "radarcharts", "legacy", and unmarked records are excluded. Doc comment records the marker taxonomy and the incident.
- `scripts/homepage-featured-pipeline-contract-test.ts` — the "radarcharts" case now asserts EXCLUSION; the pipeline input includes the WordPress import and asserts it never features; archives still keep it via the generic selection.
- `scripts/editorial-tree-contract-test.ts` — any radarcharts-as-original assertion removed (none present when this hotfix was authored).

Expected production consequence: with only WordPress imports in the live store, the homepage tree renders nothing until Notion/Studio originals are published (by design — EditorialTree returns null on an empty feed). Archives remain unchanged and still list everything.

NOT VERIFIED (no Node runtime in this session): `npm run homepage:featured-pipeline-contract-test`, `npm run test:editorial-feed`, `npm run test`, `npm run build` were NOT executed. Run them before merging.

---

## Fixed cinematic hero rework (2026-10-26 — Vibe agent)

Branch `hero/fixed-cinematic-2026-10-26` (created from main @ c7624323, head 7c04a21) — NOT merged, NOT deployed. User brief: the homepage hero engine felt "loose"; rebuild it as a fixed-style hero engine with well-integrated images, optimized loading, and smooth motion. User decisions via interview: (1) full-bleed fixed cinematic hero — smooth crossfade + subtle Ken Burns, no
 3D rotation; (2) one dominant full-bleed image on mobile, unified multi-panel composited scene on wide screens; (3) land on a new branch, merge only after user review.

What was implemented (all on the branch):
- `src/components/marketing/HeroCinematic.tsx` — NEW engine replacing HeroCube: two stacked full-bleed film layers crossfade on opacity (fadeTransitionMs 1100, var(--ease-in-out)); each panel drifts on a Ken Burns move for durationMs + fade; the incoming scene is preloaded and decoded BEFORE the fade starts; token-guarded safety timer commits the fade if transitionend is missed; transition lock ignores rapid input; autoplay (5s dwell, 8s post-interaction pause, visibility- and focus-aware, shuffle bag); touch swipe; prev/next + pause buttons; two-stage image failure fallback (fallback -> terminal); reduced motion = direct swap, no autoplay, no drift.
- Layout integration: mobile renders one dominant full-bleed image; md+ renders a seamless grid-cols-3 composite of three consecutive library images per scene (same front, front+1, front+2 window semantics as the cube, so shuffle/next/prev and announcement text is unchanged for users).
- `src/components/marketing/Hero.tsx` — media engine swapped to HeroCinematic with the same props contract (slides / fallbackSrc / resolveSrc); headline, subheadline, ticker, site overrides, GSAP reveal (clipPath on [data-hero-panel]), and the Three.js engine layer are untouched.
- `src/app/globals.css` — cube scene styles replaced with .hero-film / .hero-film-layer / .hero-film-backdrop, @keyframes hero-kenburns-a / hero-kenburns-b (alternating per-panel drift direction), and a reduced-motion kill-switch for drift + layer transitions. Ken Burns duration is driven by --hero-drift-duration (set inline = durationMs + fadeTransitionMs) so dwell and drift stay in sync from config. Nothing else in the file changed.
- `src/lib/radar-content.ts` — HeroConfig.cubeTransitionMs replaced with fadeTransitionMs (1100); durationMs stays 5000; 
slide data and the 58-entry hero library (/images/hero/radar-hero-001..058.webp) untouched.
- `tests/e2e/hero-cinematic.spec.ts` — NEW Playwright suite mirroring the old cube coverage: stacked flat layers (no perspective), Ken Burns running on the active layer, desktop three-panel scene vs mobile single image, advance/reverse crossfade, rapid-input lock, wrap-around, reduced-motion static behavior, autoplay pause/resume clock test, failure fallback chain, hero text/coordinate overrides, ticker copy.
- Deleted: `src/components/marketing/HeroCube.tsx` and `tests/e2e/hero-cube.spec.ts`.

Optimization notes: image sizes tuned to (max-width: 767px) 100vw, 34vw (mobile single full-bleed, desktop panels ~1/3 viewport); layers use contain: paint + will-change so a turn is compositor-only (opacity/transform, zero layout); only the two layers exist in the DOM (no 4-face cube of duplicated panels).

NOT VERIFIED in this session (no Node.js runtime available to the agent): npm run lint, npm run typecheck, npm run build, npm run hero:contract-test, and the Playwright suite were NOT executed. They must pass before merging. The 390x844 / 768x1024 / 1366x768 / 1920x1080 / 375x812 viewport matrix was not run.

NEXT STEPS (ordered):
1. npm install, then npm run test && npm run build && npm run hero:contract-test on the branch; fix any lint/type issues.
2. Run tests/e2e/hero-cinematic.spec.ts across the viewport matrix.
3. User review of the branch (Preview deployment recommended), then merge to main and deploy ONLY with explicit user authorization.

---

## Hero image library, 3D cube engine & 8K pipeline (2026-10-26 — Vibe agent)

Branch `hero-image-library` (created from main @ f4b481a, first commit 74df970) — NOT merged to main, NOT deployed. No production surface was touched.

What was implemented (all on the branch):
- `public/images/hero/` + `README.md` — dedicated GitHub-managed hero library folder with format (WebP), 9:16 ratio, naming (`hero-artist-001.webp`), focal-point, replacement, and validation documentation. No artwork was invented or committed; the folder is preserved by the README, so no `.gitkeep` is needed.
- `src/lib/hero-image-library.ts` — centralized `heroImages` configuration (id/src/alt/focalPoint/fit/order/active). Empty by design; `getLibraryHeroSlides()` maps entries to hero slides.
- `src/lib/radar-content.ts` — `HeroSlide` gained `focalPoint` and `fit`; `HeroConfig` gained `cubeTransitionMs: 900`; `heroConfig.slides` now uses library entries when configured and falls back to the legacy `DRIVE_HERO_IMAGES` otherwise. Drive URLs remain the live fallback until the library is populated and verified.
- `src/lib/hero-media.ts` — extracted Drive source helpers (`heroSourceSet`, `isOptimizableHeroSource`, `heroPreloadSource`) and added `preloadHeroImage()` (load + decode + timeout, never rejects).
- `src/components/marketing/HeroCube.tsx` — genuine CSS 3D cube: 4 faces, `perspective: 1400px`, `transform-style: preserve-3d`, `backface-visibility: hidden`, faces at `translateZ(width/2)` via ResizeObserver. Forward = -90deg outward rotation, backward = +90deg, easing `var(--ease-in-out)`, 900ms. Incoming image is preloaded and decoded before rotating; a safety timer normalizes state if transitionend is missed. Portrait-first: `fit: "contain"` renders the full 9:16 artwork over a blurred focal-positioned cover backdrop; `fit: "cover"` crops around the focal point. Autoplay (4s dwell, 8s pause after interaction), touch swipe, accessible prev/next buttons, aria-live slide status, failed-image fallback to `reducedMotionFallback`, and reduced-motion users get a static image with no rotation or autoplay.
- `src/components/marketing/Hero.tsx` — media engine delegated to `HeroCube`; headline, subheadline, ticker, GSAP reveal, and Three.js engine preserved. The fade-triptych transition machinery was removed (replaced by the cube).
- `src/app/globals.css` — added `.hero-cube-scene/.hero-cube/.hero-cube-face/.hero-cub
e-backdrop` styles plus a reduced-motion transition kill-switch. Nothing else in the file changed.
- `scripts/hero-image-process.ts` (+ `npm run hero:process`) — sharp pipeline: validates WebP type/integrity/dimensions, preserves the original in `originals/`, optional 8K-class master (4320x7680 portrait / 7680x4320 landscape, Lanczos3 — interpolation, NOT AI upscaling; no AI service exists in this environment and none was invented), delivery derivatives at 720/1080/1600/2160 (never upscaled), manifest `hero-images.manifest.json` with actual output dimensions, printed config snippet.
- `scripts/hero-image-contract-test.ts` (+ `npm run hero:contract-test`) — validates library entries (paths under /images/hero/, kebab-case filenames matching ids, files exist, focal points 0-100, fit values, alt text, unique ids) and the Drive fallback invariant.
- `tests/e2e/hero-cube.spec.ts` — Playwright checks: 3D geometry (perspective/preserve-3d/4 backface-culled faces), outward rotation on Next click, reduced-motion static cube.

NOT VERIFIED in this session (no Node.js runtime available to the agent): `npm run lint`, `npm run typecheck`, `npm run build`, `npm run hero:contract-test`, and Playwright e2e were NOT executed. They must pass before merging. The 390x844 / 768x1024 / 1366x768 / 1920x1080 / 375x812 viewport matrix from the brief was not run.

NEXT STEPS (ordered):
1. Run `npm install`, then `npm run test && npm run build` and `npm run hero:contract-test` on the branch; fix any lint/type issues.
2. Upload real approved WebP artwork via `npm run hero:process -- <file> --id hero-artist-001 --focal 50,35`, add entries to `heroImages`, and run the e2e suite across the viewport matrix.
3. After production verification, remove `DRIVE_HERO_IMAGES` from `radar-content.ts` to complete the Drive decommission.
4. Merge and deploy only with explicit user authorization.

---


## Current state
The Motherland motion correction was committed on `main` as `3036e779b62cc20d9e8c2cb5e44fd3
61eb106b3` (`fix: preserve Motherland scroll motion behavior`) and deployed to production. Vercel deployment `dpl_AMcfsuQ6YiSkwLw6u5cVpGTLihy4` reached `READY`, target `production`, with `radarcharts.net` assigned. Live behavior was verified after the deployment. The correction is limited to `src/app/(marketing)/motherland/motherland-motion.css`; this handoff has been updated with deployment evidence.

The latest repository activity was checked before committing: the pre-change remote main head was PR #23 merge `0a746d5`; open PR #24 was unrelated and left untouched. The correction was pushed directly to `main` after the user explicitly authorized commit and production deployment.

## What was fixed
Production inspection found that the scroll animation shorthand displaced the 26-second hero breathe animation. It also found that page’s `view()`-timeline effects stayed at fixed progress in the tested browser. The correction preserves both hero animations and drives fade/parallax from `scroll(root block)` using opacity and the independent `translate` property. The desktop root-scroll range is 0%–8%; at widths up to 767px it is 0%–5.3%. The title/intro rise uses 1.3%–3.3% on desktop and 0.75%–2.2% on mobile. Reduced-motion rules disable the CSS hero, title/intro, and ticker animations; the animated GIF remains image content.

No page copy or ticker content was changed. `MOTHERLAND_TICKER_ITEMS` remains the placeholder `['MOTHERLAND']`. The page remains a page highlighting the female segment, not an archive. No other pages were changed.

## Production verification
- Vercel deployment `dpl_AMcfsuQ6YiSkwLw6u5cVpGTLihy4` is `READY`, target `production`, alias `radarcharts.net`, Git ref `main`, exact SHA `3036e779b62cc20d9e8c2cb5e44fd3f61eb106b3`. Build event output reported “Compiled successfully”, TypeScript completion, page generation, and “Build Completed in /vercel/output [36s]”.
- `https://radarcharts.net/motherland` returned HTTP 200. Rendered HTML contained the `
/motherland/featured.gif` hero and repeated `MOTHERLAND` ticker content. `https://radarcharts.net/motherland/featured.gif` returned HTTP 200 with `content-type: image/gif`.
- Chromium Playwright checked the live production route at 1440×900 and 390×844, using the deployed CSS without injecting a local stylesheet. For fast full-frame rendering only, the browser request for the GIF was fulfilled with the unchanged repository master; the page, CSS, and route were production-served. No browser page errors occurred.
- At both viewports, the hero computed animation names were `motherland-breathe, motherland-hero-exit` and its timeline was `auto, scroll(root)`. The breathe transform changed during a 1.2-second sample at 1440px. Hero opacity/translation changed with scroll: desktop samples at scrollY 0/450/900 were 1/0.782/0.565; mobile samples at 0/422/844 were 1/0.776/0.551.
- The title/intro opacity rose from 0 to partial to 1 as scroll advanced: desktop 0/0.425/1 at scrollY 0/250/400; mobile 0/0.130/0.562/1 at 0/150/250/400. The ticker’s `marquee-x` transform changed during an 800ms sample. Document width matched viewport width at 1440px and 390px; no horizontal overflow was observed.
- With Playwright emulating `prefers-reduced-motion: reduce` at 390px, computed CSS animation names were `none` for the hero, title/intro, and ticker. The GIF remained present with natural dimensions 540×960.

## Build and test record
The exact local command `npm run test && npm run build` passed after the final motion changes. `npm run test` runs lint and typecheck: ESLint had 0 errors and 6 warnings in unrelated files; `tsc --noEmit` passed. Next.js compiled and generated 498 static pages, including `/motherland`.

The first ordinary `npm ci` failed because the ARM64 Sandbox encountered the lockfile’s x64 Sharp optional binary (`EBADPLATFORM`). `npm ci --force` installed 1034 packages. npm reported 9 high-severity audit findings; no dependency or lockfile edits were made as part of this 
work.

Commands for deployment/recent activity included `git fetch origin`, `git log -3 --date=iso-strict --pretty=format:'%h %ad %s' origin/main`, `git diff --check`, `git add -- 'src/app/(marketing)/motherland/motherland-motion.css' HANDOFF.md`, `git commit -m "fix: preserve Motherland scroll motion behavior"`, and `git push origin main`.

## Visual notes and boundaries
The 540×960 GIF master is 24,305,448 bytes and visibly soft when enlarged at 1440px. The floating site-wide audio player control overlaps the hero/ticker’s bottom-right corner. Both are documented observations only; neither was changed.

Do not modify `public/motherland/featured.gif`, the homepage `Hero.tsx` ticker configuration, other pages, or the Gande “Insta Babe” 404 imagery without valid originals. No production configuration, aliases, content, or data were changed. The remaining content dependencies are real ticker copy, future page text, valid Gande originals, and an optional higher-resolution Motherland master.


## HOTFIX: Notion editorial articles missing from production (2026-11-03 — Manus)

**Scope:** Keep the current Vercel production project and `radarcharts.net` domain. No Cloudflare Pages/Vercel project setting, domain, DNS, or Notion page property changes are part of this fix.

**Verified cause:** Vercel production has `RADAR_CONTENT_STORE=cloudflare` and `RADAR_NOTION_DIRECT_READ_ENABLED=true`, but `readContentUncached()` immediately returned the existing Cloudflare R2 snapshot whenever that object was present. The object `content/radarsite-content-v1.json` was last updated 2026-10-24 and contained 342 article records but none of the six requested Notion slugs. Therefore the current Notion source was bypassed. Separately, the direct-read fallback previously aborted the entire Notion content result when R2 relationship lookup or image import failed.

**Change in this commit:** When direct Notion read is enabled, load the current R2 content as the base, merge eligible Notion records into that base, and persist the merged content with an ETag/revision-checked R2 write (up to three conflict retries). Preserve existing non-Notion content and media relationships; skip the write if the revision is already current or the merged payload exceeds the configured size limit. If storage cannot be read or written, keep serving the merged content for that read. If an image cannot be verified/imported, log a sanitized warning and omit only that image; never fall back to the short-lived Notion URL. The public content cache key/tag was bumped to v3 so the prior snapshot cache cannot mask the fix.

**Editorial boundary:** Notion inspection verified the six requested pages have a Featured Image Upload and inline image blocks. Some page Editorial Notes disagree with the current Publish checkbox/status. The user explicitly authorized using all six according to the existing publish gate; this change does not write back to Notion.

**Local verification:** `npm run notion:contract-test`, `npm run cloudflare-content:contract-test`, `npm run notion:media-webp-contract-test`, focused ESLint on the three changed TypeScript files, and `npm run typecheck` passed. `npm run lint -- --ignore-pattern '.cloudflare/**' --ignore-pattern '.next/**'` passed with zero errors and six pre-existing warnings outside the changed files. `RADAR_NOTION_DIRECT_READ_ENABLED= npm run build` passed and generated 475 routes using only the committed snapshot; it intentionally did not contact Notion or R2. The default `npm run test` was also attempted but its repository-wide lint step traversed generated `.cloudflare` bundles and reported 319 errors/12,930 warnings; changed-file lint and the source-only lint run passed.

**Production deployment verification:** Pending the authorized push to `main` and Vercel's production build. Confirm the deployment is READY on the `radarsite` project and that all six canonical article URLs return HTTP 200 with their article text. Verify images resolve to validated R2 public URLs where import succeeds; if R2 media remains unavailable, confirm the page renders text without Notion signed URLs. Confirm the R2 content revision now includes the six page IDs/slugs while retaining existing content. Vercel runtime error aggregation at review time had no clusters in the last seven days; a broad 7-day log query timed out, so this code finding—not current runtime logs—is the direct evidence for the root cause.

