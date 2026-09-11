# Lighthouse and Accessibility Audit

**Date:** 2026-09-11  
**Repository:** `remRADAR/RADARSite`  
**Audit target:** Local optimized production server (`next start --port 3101`)  
**Public route header check:** 17 marketing/legal routes

## Header coverage

The audit found that `src/components/marketing/MarketingChrome.tsx` previously rendered `SiteHeader` only when `pathname === "/"`. That condition was removed so the shared public header renders on every route using the marketing layout.

The root-level `/privacy` and `/terms` routes do not inherit the marketing layout, so both pages now render `SiteHeader` explicitly and expose their content through `main#main-content`.

A new Playwright suite, `tests/e2e/header.spec.ts`, checks the header banner and home link on these 17 routes:

`/`, `/about`, `/about/our-story`, `/about/ecosystem`, `/motherland`, `/ontheradar`, `/ontheradar/articles`, `/ontheradar/magazine`, `/ontheradar/projects`, `/ontheradar/events`, `/radarmusic`, `/radarmusic/artists`, `/radarmusic/releases`, `/work`, `/work/luna-vale-first-light`, `/privacy`, and `/terms`.

**Result:** 17 of 17 tests passed.

## Accessibility results

The expanded axe audit covered 12 public routes:

`/`, `/about`, `/about/our-story`, `/motherland`, `/ontheradar`, `/ontheradar/articles`, `/ontheradar/projects`, `/radarmusic`, `/radarmusic/artists`, `/work`, `/privacy`, and `/terms`.

The audit reported no critical or serious axe violations on any route. Lighthouse Accessibility scored **100/100** on the homepage production audit.

The updated legal pages now have a shared header and a valid `main#main-content` landmark, preserving the root skip-link target.

## Lighthouse production baseline

The audit was run against the optimized Next.js production server rather than the development server.

| Metric | Result |
|---|---:|
| Performance | **34/100** |
| Accessibility | **100/100** |
| First Contentful Paint | **5.3 s** |
| Largest Contentful Paint | **11.8 s** |
| Total Blocking Time | **1,850 ms** |
| Cumulative Layout Shift | **0** |
| Speed Index | **5.3 s** |

## Performance findings

The performance score is below production targets. The principal Lighthouse opportunities are JavaScript execution and payload size: approximately 1.85 seconds of blocking time, a large JavaScript payload, unused JavaScript, forced reflow work, and image-delivery savings. The production build also contains substantial interactive/WebGL/GSAP functionality that should be profiled before making broad optimizations.

No performance optimization was applied blindly in this pass because the user request was an audit plus header coverage, and the next safe step requires a trace/bundle attribution pass. The zero CLS result indicates that the header addition did not introduce measurable layout shift in this run.

## Verification commands

```bash
npm run lint
npx tsc --noEmit
npm run build
BASE_URL=http://127.0.0.1:3100 node scripts/check-accessibility.mjs
npx playwright test tests/e2e/header.spec.ts --workers=1
npx lighthouse http://127.0.0.1:3101/ --only-categories=performance,accessibility
```

All commands completed successfully. The first Lighthouse run against `next dev` scored Performance 46 with LCP 18.4s; it was discarded as a non-production baseline. The reported 34/100 score is from `next start` after a production build.

## Recommended next performance pass

1. Capture a Lighthouse trace and inspect the largest JavaScript contributors.
2. Profile GSAP/ScrollTrigger, Lenis, WebGL, and third-party media initialization separately.
3. Audit the homepage LCP element and hero image request priority/dimensions.
4. Defer below-the-fold interactive modules and noncritical media where safe.
5. Re-run Lighthouse against `next start` and compare FCP, LCP, TBT, and total payload.
