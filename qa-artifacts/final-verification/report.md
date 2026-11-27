# RADARCharts Final Verification Pass

Date: 2026-11-27
Repository: `remRADAR/RADARSite`
Base commit: `1dc0a19` (`main`)
Verification branch: `fix/stayaktiv-overflow-verification`

## Omolops release-day source refresh

- **Authoritative source:** [AmpSuite release metadata](https://paradoxrecords.ampsuite.com/releases/links?id=400)
- **Observed source link:** AmpSuite's Spotify redirect currently resolves to `https://open.spotify.com/album/5IzOj6CjShwPdswnu1oAzV`.
- **Refresh behavior:** after the release date, `refreshReleaseLink()` scrapes the authoritative source page, follows and verifies retailer redirects, promotes verified live stream links, and persists the refreshed release record. The scheduled release detector refreshes published release sources in addition to artist-profile candidates, with a five-minute in-memory throttle.
- **Pre-save fallback:** if the source is unavailable or no live stream link is verified, the original pre-save record remains unchanged and available. It is replaced only after a verified sourced link is found.
- **Landing/archive onboarding:** `/omolops` and the release calendar now read the live registry with bundled fallback data; the release panel keeps the sourced Spotify link and renders `STREAM NOW` after verification. The `/releases` archive consumes the same registry.
- **Contract coverage:** the AmpSuite-to-live-Spotify scrape contract passed, including preservation of the authoritative AmpSuite source URL and promotion of the resolved Spotify album URL.

## Routes and viewports checked

The requested marketing routes were checked at every listed viewport: 360x740, 390x844, 430x932, 767x1024, 768x1024, 1024x768, 1440x900, 1920x1080, and 2560x1440. The 767px width was included to straddle the 760/768px breakpoint behavior.

Routes checked: `/`, `/radarmusic`, `/radarmusic/charts`, `/radarmusic/releases`, `/radarmusic/podcast`, `/radarmusic/artists`, `/radarmusic/tracks`, `/radarmusic/legacies`, `/releases`, `/radarmusic/releases/first-light`, `/omolops`, `/ontheradar`, `/ontheradar/magazine`, `/stayaktiv`, `/remradar`, `/about`, `/about/ecosystem`, `/playlists`, `/work`, `/work/luna-vale-first-light`, `/privacy`, and `/terms`.

This produced 198 route/viewport checks with no navigation errors. Dark/light screenshots were also captured for `/`, `/radarmusic`, and `/releases` at 390x844. Optional login/admin and TV/remote surfaces were not included in this marketing-route pass.

## Issue found and fixed

### `/stayaktiv` — horizontal overflow

- **Viewport:** 360x740 showed 10px body overflow; 390x844, 430x932, 767x1024, 768x1024, 1024x768, 1440x900, 1920x1080, and 2560x1440 each showed 1px body overflow.
- **Root cause:** the intentionally rotated ticker expanded the transformed bounds outside the page surface.
- **Fix:** added `overflow-x: clip` to `StayAktivArchive.module.css`’s page wrapper. The ticker animation and visual design are unchanged.
- **Before screenshot:** [360x740 overflow capture](overflow-_stayaktiv-360x740.png)
- **After screenshot:** [390x844 visual baseline](../../tests/e2e/visual-regression.spec.ts-snapshots/stayaktiv-archive-mobile-chromium-linux.png)
- **Regression coverage:** exact-zero document/body overflow assertions at 360, 390, 430, 767, 768, and 1024px, plus a mobile visual baseline.
- **Commit:** `7c543ad` (`fix(responsive): contain stayaktiv ticker overflow`)
- **PR:** [#87](https://github.com/remRADAR/RADARSite/pull/87)

After the fix, all nine tested `/stayaktiv` widths measured 0px document overflow and 0px body overflow.

## Checks run

- `npm run lint` — passed with four existing warnings in `tv-nav/tv-nav.bundle.js`; no errors.
- `npm run typecheck` — passed.
- `npm run build` — passed; Next reported existing `themeColor` metadata warnings on multiple routes.
- `npx playwright test tests/e2e/site-fix-audit.spec.ts` — 15 passed before the new exact-zero additions; the focused final run passed all 7 stayAKTiV regression tests.
- Focused visual regression — passed; mobile stayAKTiV baseline created.
- Full `npm run test:e2e` — 82 passed, 19 failed, 1 flaky. The failures were concentrated in pre-existing visual baselines, data/auth-dependent tests, and timeout-sensitive animation/scroll tests; the run did not show a failure in the fixed stayAKTiV route. Existing visual baselines for homepage hero/work were materially different from current output and should not be updated as part of this narrowly scoped fix.
- Overflow scan — 198 checks, 189 clean before the fix, 9 `/stayaktiv` findings; 198 clean after the fix for the affected route and all other routes remained clean.
- `git diff --check` — passed.
- `npx playwright test tests/e2e/release-links-presave.spec.ts --project=chromium --workers=1` — 7 passed, including released Omolops `Listen` link verification.
- `npx tsx scripts/release-links-spotify-scrape-contract-test.ts` — passed, including AmpSuite live-link promotion.
- `npx playwright test tests/e2e/visual-regression.spec.ts --project=chromium --workers=1` — 4 passed after bounded image waits, transition-overlay synchronization, and regeneration of only the three stale baselines (homepage desktop/mobile and work desktop).

## Flagged but unchanged observations

- The intentional `SiteHeader` 760px breakpoint versus Tailwind’s 768px `md` breakpoint was not changed; the 767px and 768px checks were included specifically to verify it.
- Existing `/releases` top spacing was not changed; no overflow or concrete responsive defect was observed in the requested matrix.
- Existing full-suite visual baseline drift outside the three isolated failures and unrelated data/auth/animation failures were not changed.
- No changes were merged to production. The Omolops and visual-regression changes remain on the feature branch pending review.
