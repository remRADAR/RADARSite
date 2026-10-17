# HANDOFF — RADARSite (radarcharts.net)

## CURRENT STATE
- Last updated: 2026-10-17 — verification and Motherland motion follow-up.
- Phase: production verification complete; a page-scoped motion correction is implemented locally and awaits the next authorized commit/deployment step.
- Branch: `main`, based on `0a746d5ac200d16fe484a5b0cce057f045eb0ee7` (PR #23 squash merge).
- Local modifications: `src/app/(marketing)/motherland/motherland-motion.css` and this ledger. No commit or production deployment was made for the follow-up correction.

## RECENT REPOSITORY ACTIVITY
- `git log -8 --date=iso-strict`: latest commit is `0a746d5` (2026-10-17T03:28:24Z), “feat: Motherland hero GIF with scroll motion and MOTHERLAND ticker (#23)”.
- PR #23 is merged. Latest open PR observed in GitHub activity is #24, “Fix RADAR brand ticker copy and community link”; it is unrelated and was not changed. Other listed open PRs were not modified.
- Initial clone was clean and matched `origin/main` at the merge SHA. Re-check remote activity before any future commit/deployment.

## PRODUCTION — VERIFIED
- Vercel deployment `dpl_2YcuEqoexT2vgJ8aUoPue1R6rxRj` is `READY`, target `production`, alias `radarcharts.net`, Git ref `main`, exact SHA `0a746d5ac200d16fe484a5b0cce057f045eb0ee7`.
- `https://radarcharts.net/motherland` returned HTTP 200; its server-rendered HTML includes the `/motherland/featured.gif` hero and repeated `MOTHERLAND` ticker content. `https://radarcharts.net/motherland/featured.gif` returned HTTP 200 and `image/gif`.
- Production browser view confirmed the GIF hero precedes the heading and article highlights, with the flowing MOTHERLAND ticker pinned at the hero’s bottom. The page remains a page, not an archive rewrite; page copy and ticker placeholder are unchanged.
- The Sandbox browser’s current viewport was 1280px wide, not 1440px; exact 1440px and 390px checks were subsequently run in Playwright against the production route with the current local Motherland CSS injected and the repository GIF served locally for complete-frame capture. Those checks validate the local correction but do not mean it is deployed.

## MOTION FINDINGS AND LOCAL CORRECTION
- Production CSS inspection showed that, in browsers supporting scroll timelines, the existing `animation` shorthand replaced `motherland-breathe` with `motherland-hero-exit`; production therefore did not run the breathe loop and scroll effect together.
- Browser sampling also showed the old `view()` timelines on the overflow-clipped hero image and title elements remained at fixed progress when the page scrolled. This made the parallax and title rise ineffective in the tested browser.
- Local correction in `motherland-motion.css` keeps the 26s breathe animation and layers a root-scroll parallax/fade animation using independent `translate` and `opacity` properties. It uses an 8% root-scroll range on desktop and 5.3% at widths up to 767px. Title/intro rise uses a root-scroll range of 1.3%–3.3% on desktop and 0.75%–2.2% on mobile. Browsers without supported scroll timelines retain the documented fallback; reduced motion removes all CSS animation.
- Playwright validation of the production route with this local CSS at 1440×900 and 390×844 observed: both hero animations active; the breathe transform changes over time; hero opacity/translation changes across scroll; index title opacity moves from 0 to partial to 1; ticker `marquee-x` runs; and document width equals viewport width (no horizontal overflow). At 1440px hero opacity sampled as 1, 0.782, 0.565 at scrollY 0, 450, 900. At 390px it sampled as 1, 0.776, 0.551 at scrollY 0, 422, 844. Title opacity samples were 0/0.425/1 (desktop) and 0/0.130/0.562/1 (mobile at scroll 0/150/250/400). No browser page errors were observed.
- With emulated `prefers-reduced-motion: reduce` at 390px, computed animation names were `none` for hero, title/intro, and ticker; the GIF URL remained present and its 540×960 image dimensions remained available. The GIF is content and continues as the browser’s animated image resource.

## VISUAL NOTES / KNOWN LIMITS
- The master `public/motherland/featured.gif` is 540×960 (24,305,448 bytes). At 1440px it is visibly soft from enlargement; this is expected from the supplied master and is not “fixed” by replacing or re-encoding it.
- The site-wide floating audio player control overlaps the hero/ticker’s bottom-right corner in desktop and mobile screenshots. It is outside the Motherland-scoped request and was not restyled.
- The local corrected CSS has not yet been committed or deployed; production still serves merged commit `0a746d5` until a later deployment.

## COMMANDS AND CHECK RESULTS
- `gh repo clone remRADAR/RADARSite`; `git status --short --branch`; `git log -8 --date=iso-strict --pretty=format:'%h %ad %s'`; `gh pr view 23 --json state,mergedAt,mergeCommit,title,url`; `gh pr list --state all --limit 8 --json number,title,state,updatedAt,url` — confirmed main/merge state and recent activity.
- `curl -sSI https://radarcharts.net/motherland` — HTTP 200. `curl -sSL https://radarcharts.net/motherland | grep -Eo 'MOTHERLAND|featured\.gif|motherland-motion\.css' | sort | uniq -c` — hero asset and ticker content present. `curl -sSI https://radarcharts.net/motherland/featured.gif` — HTTP 200, `image/gif`.
- First `npm ci` failed with `EBADPLATFORM`: ARM64 Sandbox encountered the lockfile’s `@img/sharp-libvips-linux-x64@1.3.4` optional binary. `npm ci --force` succeeded (1034 packages installed); npm reported 9 high-severity audit findings. No dependency or lockfile edits were made.
- Final `npm run test && npm run build` passed after root-scroll threshold tuning: ESLint completed with 0 errors and 6 existing warnings in unrelated files, `tsc --noEmit` passed, and Next.js compiled and generated 498 static pages. The build output includes `/motherland` as a statically prerendered route. No new warning was emitted for the scoped motion stylesheet.
- Browser verification used local Playwright Chromium 149 on ARM64, visiting the live production route at 1440×900 and 390×844. The CSS was injected from the local stylesheet and the existing repository GIF was served from disk to avoid waiting for its full 24.3MB production download. Reduced-motion was emulated through Playwright. This is a controlled visual/runtime check, not a production deployment check of the local patch.

## DECISIONS AND DO-NOT-TOUCH BOUNDARIES
- Preserve `MOTHERLAND_TICKER_ITEMS = ["MOTHERLAND"]` until the user supplies the real ticker copy.
- Do not rewrite Motherland copy or turn the page into an archive; its posts are highlights of the female segment and more content is expected.
- Do not touch `public/motherland/featured.gif`, homepage `Hero.tsx` ticker config, other pages, or the Gande “Insta Babe” images without valid originals.
- No production config, content, data, deployment, or aliases were changed during this verification.

## OPEN ITEMS / NEXT GATE
1. The final `npm run test && npm run build` result is green. The local CSS fix is uncommitted and not live; commit and deploy only with the appropriate authorization, then repeat production browser verification against the deployed commit.
2. Await replacement artwork for the Gande 404 images and a higher-resolution Motherland master if desktop sharpness is desired.
3. Await user ticker content and future page text; no placeholder copy was changed.
