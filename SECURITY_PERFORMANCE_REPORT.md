# RADARSite Security, Performance, and Stability Report

## Scope

This report records the hardening and performance work staged from the attached engineering prompt. The implementation preserves the existing RADAR visual system and adds defensive behavior around the public marketing site and Studio API.

## Implemented safeguards

| Area | Change |
|---|---|
| HTTP security | Added CSP, HSTS, frame, MIME-sniffing, referrer, permissions, cross-origin, and API cache headers in `next.config.ts`. |
| API protection | Added bounded per-IP, per-route rate limiting, same-origin checks for POST/PUT/DELETE, no-store API responses, and existing JSON payload bounds. |
| Authentication | Preserved HTTP-only, SameSite session cookies, timing-safe password comparison, bounded failed-login attempts, and short-lived signed sessions. |
| Caching | Added immutable cache policy for Next static assets and supplied hero assets; added no-store policy for API routes and a no-cache policy for the service-worker manifest. |
| Offline support | Added a versioned service worker with install/activate lifecycle, stale-cache cleanup, safe same-origin GET caching, and network fallback. |
| Stability | Added route-level and root-level React error boundaries with retry/recovery UI. |
| Upstream resilience | Added an eight-second timeout to Unsplash requests; existing fallbacks remain in place. |
| Image delivery | Hero assets are WebP and rendered through `next/image` with responsive `sizes`, `object-cover`, and priority loading for the first above-the-fold slide. |

## Verification

`npm run lint`, `npx tsc --noEmit`, and `npm run build` pass. The expanded responsive audit covers 320x568, 375x812, 390x844, 768x1024, 1024x768, 1280x720, 1440x900, and 1920x1080. Hero bounds matched the viewport width at each size, hero images loaded successfully, the menu expansion remained in normal document flow, and all seven social links remained present. Intentional marquee-track overflow is excluded from page-overflow checks.

The draggable PlaylistFloater's browser-dependent position, playback state, and iframe origin are now deferred through a hydration-safe mount snapshot, removing the previously documented mismatch source. The local environment did not provide OWASP ZAP, k6, or Lighthouse binaries, so those scans are not claimed as completed. A full distributed rate limiter, MFA, Sentry/LogRocket integration, and provider-level WAF/DDoS protection require production infrastructure and credentials not present in this repository.

## Hero HD cleanup

The homepage hero no longer applies a full-image darkening overlay, a full-image gradient, or the hero-specific vertical grid layer. The obsolete `overlayStrength` setting was removed from the hero configuration after repository-wide consumer search. Dark headline lines retain their black fill with a thin, low-opacity white stroke, while the highlighted final line and supporting copy receive intentionally lighter treatment. Existing carousel transitions, image priority loading, GSAP headline animation, slide controls, reduced-motion behavior, and responsive composition remain intact.

## Required environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon database connection for Studio persistence. |
| `STUDIO_ADMIN_PASSWORD` | Secret used for timing-safe admin password validation and signed Studio session tokens. Use a long random value and never commit it. |
| `UNSPLASH_ACCESS_KEY` | Optional server-only Unsplash access key for editorial image lookup. |

## Dependency audit

The current `npm audit` reports 12 transitive vulnerabilities across moderate and high severity packages, including advisories involving the pinned Next.js, PostCSS, Sharp, Undici, and related transitive dependencies. They should be remediated in a dedicated dependency-upgrade change after checking framework compatibility; blindly applying `npm audit fix --force` is not safe for this app because it can introduce major framework changes.
