# HANDOFF — RADARSite (radarcharts.net)

## Fixed cinematic hero rework (2026-10-26 — Vibe agent)

Branch `hero/fixed-cinematic-2026-10-26` (created from main @ c7624323, head 7c04a21) — NOT merged, NOT deployed. User brief: the homepage hero engine felt "loose"; rebuild it as a fixed-style hero engine with well-integrated images, optimized loading, and smooth motion. User decisions via interview: (1) full-bleed fixed cinematic hero — smooth crossfade + subtle Ken Burns, no 3D rotation; (2) one dominant full-bleed image on mobile, unified multi-panel composited scene on wide screens; (3) land on a new branch, merge only after user review.

What was implemented (all on the branch):
- `src/components/marketing/HeroCinematic.tsx` — NEW engine replacing HeroCube: two stacked full-bleed film layers crossfade on opacity (fadeTransitionMs 1100, var(--ease-in-out)); each panel drifts on a Ken Burns move for durationMs + fade; the incoming scene is preloaded and decoded BEFORE the fade starts; token-guarded safety timer commits the fade if transitionend is missed; transition lock ignores rapid input; autoplay (5s dwell, 8s post-interaction pause, visibility- and focus-aware, shuffle bag); touch swipe; prev/next + pause buttons; two-stage image failure fallback (fallback -> terminal); reduced motion = direct swap, no autoplay, no drift.
- Layout integration: mobile renders one dominant full-bleed image; md+ renders a seamless grid-cols-3 composite of three consecutive library images per scene (same front, front+1, front+2 window semantics as the cube, so shuffle/next/prev and announcement text are unchanged for users).
- `src/components/marketing/Hero.tsx` — media engine swapped to HeroCinematic with the same props contract (slides / fallbackSrc / resolveSrc); headline, subheadline, ticker, site overrides, GSAP reveal (clipPath on [data-hero-panel]), and the Three.js engine layer are untouched.
- `src/app/globals.css` — cube scene styles replaced with .hero-film / .hero-film-layer / .hero-film-backdrop, @keyframes hero-kenburns-a / hero-kenburns-b (alternating per-panel drift direction), and a reduced-motion kill-switch for drift + layer transitions. Ken Burns duration is driven by --hero-drift-duration (set inline = durationMs + fadeTransitionMs) so dwell and drift stay in sync from config. Nothing else in the file changed.
- `src/lib/radar-content.ts` — HeroConfig.cubeTransitionMs replaced with fadeTransitionMs (1100); durationMs stays 5000; slide data and the 58-entry hero library (/images/hero/radar-hero-001..058.webp) untouched.
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
- `src/components/marketing/HeroCube.tsx` — genuine CSS 3D cube: 4 faces, `perspective: 1400px`, `transform-style: preserve-3d`, `backface-visibility: hidden`, faces at `translateZ(width/2)` via ResizeObserver. Forward = -90deg outward rotation, backward = +90deg, easing `var(--ease-in-out)`, 900ms. Incoming image is preloaded and decoded before rotating; a safety timer normalizes state if `transitionend` is missed. Portrait-first: `fit: "contain"` renders the full 9:16 artwork over a blurred focal-positioned cover backdrop; `fit: "cover"` crops around the focal point. Autoplay (4s dwell, 8s pause after interaction), touch swipe, accessible prev/next buttons, aria-live slide status, failed-image fallback to `reducedMotionFallback`, and reduced-motion users get a static image with no rotation or autoplay.
- `src/components/marketing/Hero.tsx` — media engine delegated to `HeroCube`; headline, subheadline, ticker, site overrides, GSAP reveal, and Three.js engine preserved. The fade-triptych transition machinery was removed (replaced by the cube).
- `src/app/globals.css` — added `.hero-cube-scene/.hero-cube/.hero-cube-face/.hero-cube-backdrop` styles plus a reduced-motion transition kill-switch. Nothing else in the file changed.
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
The Motherland motion correction was committed on `main` as `3036e779b62cc20d9e8c2cb5e44fd3f61eb106b3` (`fix: preserve Motherland scroll motion behavior`) and deployed to production. Vercel deployment `dpl_AMcfsuQ6YiSkwLw6u5cVpGTLihy4` reached `READY`, target `production`, with `radarcharts.net` assigned. Live behavior was verified after the deployment. The correction is limited to `src/app/(marketing)/motherland/motherland-motion.css`; this handoff has been updated with deployment evidence.

The latest repository activity was checked before committing: the pre-change remote main head was PR #23 merge `0a746d5`; open PR #24 was unrelated and left untouched. The correction was pushed directly to `main` after the user explicitly authorized commit and production deployment.

## What was fixed
Production inspection found that the scroll animation shorthand displaced the 26-second hero breathe animation. It also found that the page’s `view()`-timeline effects stayed at fixed progress in the tested browser. The correction preserves both hero animations and drives fade/parallax from `scroll(root block)` using opacity and the independent `translate` property. The desktop root-scroll range is 0%–8%; at widths up to 767px it is 0%–5.3%. The title/intro rise uses 1.3%–3.3% on desktop and 0.75%–2.2% on mobile. Reduced-motion rules disable the CSS hero, title/intro, and ticker animations; the animated GIF remains image content.

No page copy or ticker content was changed. `MOTHERLAND_TICKER_ITEMS` remains the placeholder `['MOTHERLAND']`. The page remains a page highlighting the female segment, not an archive. No other pages were changed.

## Production verification
- Vercel deployment `dpl_AMcfsuQ6YiSkwLw6u5cVpGTLihy4` is `READY`, target `production`, alias `radarcharts.net`, Git ref `main`, exact SHA `3036e779b62cc20d9e8c2cb5e44fd3f61eb106b3`. Build event output reported “Compiled successfully”, TypeScript completion, page generation, and “Build Completed in /vercel/output [36s]”.
- `https://radarcharts.net/motherland` returned HTTP 200. Rendered HTML contained the `/motherland/featured.gif` hero and repeated `MOTHERLAND` ticker content. `https://radarcharts.net/motherland/featured.gif` returned HTTP 200 with `content-type: image/gif`.
- Chromium Playwright checked the live production route at 1440×900 and 390×844, using the deployed CSS without injecting a local stylesheet. For fast full-frame rendering only, the browser request for the GIF was fulfilled with the unchanged repository master; the page, CSS, and route were production-served. No browser page errors occurred.
- At both viewports, the hero computed animation names were `motherland-breathe, motherland-hero-exit` and its timeline was `auto, scroll(root)`. The breathe transform changed during a 1.2-second sample at 1440px. Hero opacity/translation changed with scroll: desktop samples at scrollY 0/450/900 were 1/0.782/0.565; mobile samples at 0/422/844 were 1/0.776/0.551.
- The title/intro opacity rose from 0 to partial to 1 as scroll advanced: desktop 0/0.425/1 at scrollY 0/250/400; mobile 0/0.130/0.562/1 at 0/150/250/400. The ticker’s `marquee-x` transform changed during an 800ms sample. Document width matched viewport width at 1440px and 390px; no horizontal overflow was observed.
- With Playwright emulating `prefers-reduced-motion: reduce` at 390px, computed CSS animation names were `none` for the hero, title/intro, and ticker. The GIF remained present with natural dimensions 540×960.

## Build and test record
The exact local command `npm run test && npm run build` passed after the final motion changes. `npm run test` runs lint and typecheck: ESLint had 0 errors and 6 warnings in unrelated files; `tsc --noEmit` passed. Next.js compiled and generated 498 static pages, including `/motherland`.

The first ordinary `npm ci` failed because the ARM64 Sandbox encountered the lockfile’s x64 Sharp optional binary (`EBADPLATFORM`). `npm ci --force` installed 1034 packages. npm reported 9 high-severity audit findings; no dependency or lockfile edits were made as part of this work.

Commands for deployment/recent activity included `git fetch origin`, `git log -3 --date=iso-strict --pretty=format:'%h %ad %s' origin/main`, `git diff --check`, `git add -- 'src/app/(marketing)/motherland/motherland-motion.css' HANDOFF.md`, `git commit -m "fix: preserve Motherland scroll motion behavior"`, and `git push origin main`.

## Visual notes and boundaries
The 540×960 GIF master is 24,305,448 bytes and visibly soft when enlarged at 1440px. The floating site-wide audio player control overlaps the hero/ticker’s bottom-right corner. Both are documented observations only; neither was changed.

Do not modify `public/motherland/featured.gif`, the homepage `Hero.tsx` ticker configuration, other pages, or the Gande “Insta Babe” 404 imagery without valid originals. No production configuration, aliases, content, or data were changed. The remaining content dependencies are real ticker copy, future page text, valid Gande originals, and an optional higher-resolution Motherland master.
