# HANDOFF — RADARSite (radarcharts.net)

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
