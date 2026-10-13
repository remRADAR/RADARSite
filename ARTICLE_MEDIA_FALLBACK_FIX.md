# Article media fallback and embed fix

Date: 2026-10-13
Scope: `src/lib/editorial-migration.ts`, `src/lib/effective-image-url.ts`, `src/components/ResilientImage.tsx`, `src/components/marketing/EditorialMediaEnhancer.tsx`, `src/app/globals.css`, `next.config.ts`, `scripts/test-effective-image-url.mjs`, `tests/e2e/article-media.spec.ts`

## What was broken

1. **Dead Jetpack/Photon rewrite.** `getEffectiveImageUrl` rewrote every `https://radarcharts.net/wp-content/uploads/...` URL to `https://i0.wp.com/radarcharts.net/...`. The self-hosted WordPress origin is retired (radarcharts.net now serves this Next.js site), so Photon returns "We cannot complete this request, remote data could not be fetched" for every current-article image. All 63 current articles (604 media references) rendered broken featured and inline images. `cdn.radarcharts.net` was also investigated as a rewrite target: it no longer resolves in DNS, so it is not a viable delivery host.
2. **http inline images dropped.** The sanitizer's `safeUrl` rejected any non-`https:` URL, so 61 inline `<img>` tags with `http://radarcharts.net/...` sources (across 47 articles) were removed entirely at render time.
3. **No runtime fallback for inline media.** `EditorialMediaEnhancer` only activated `img[data-src]`/`iframe[data-src]`, but the sanitizer strips `data-src` and keeps `src`, so the enhancer was dead code: broken inline images showed raw browser broken-image icons and embeds had no loading/error states (the CSS hooks `img.is-error`, `.editorial-embed.is-loading/is-error` never triggered).
4. **Stale failure state in `ResilientImage`.** `failed`/`loaded` were never reset when `src` changed, and an empty `src` rendered `<img src="">`.
5. **Spotify embeds cropped.** The sanitizer generated 152px (track) and 352px (album/playlist/episode/show) players, but CSS forced every Spotify wrapper to `height: 152px` via `:has(iframe[src*="open.spotify.com"])`, cutting off large players.
6. **SoundCloud embeds CSP-blocked.** The sanitizer allowlist permits `w.soundcloud.com`/`soundcloud.com` iframes, but the CSP `frame-src` did not, so SoundCloud embeds rendered blank.
7. **Silently dropped embeds.** Iframes from non-allowlisted hosts were removed without a trace; known social providers (Instagram/TikTok/X/Facebook) now degrade to a safe outbound link, matching the existing Instagram blockquote fallback.

## What changed

- `src/lib/effective-image-url.ts`: removed the broken i0.wp.com rewrite. Eligible radarcharts.net upload URLs pass through unchanged (`reason: "source-passthrough"`); everything else is `not-eligible` and returned as-is. The function remains the single place that decides the delivery URL, so the R2 migration can reintroduce a rewrite here later.
- `src/lib/editorial-migration.ts`:
  - `safeUrl` upgrades `http:` to `https:` instead of dropping the URL (consistent with the site-wide `upgrade-insecure-requests` CSP), restoring the 47 articles' inline images.
  - Non-allowlisted iframes from known social providers become a styled `editorial-embed-fallback` link instead of vanishing.
  - The iframe wrapper step adds `editorial-embed--spotify-track` / `editorial-embed--spotify-large` modifier classes based on the embed URL.
- `src/components/ResilientImage.tsx`: resets state on `src` change, handles empty `src`, retries once after 1200ms (via element remount), then renders a branded gradient placeholder with an "Image unavailable" label.
- `src/components/marketing/EditorialMediaEnhancer.tsx`: now live. Watches plain-`src` `img.editorial-media` (marks `is-ready`/`is-error`, one retry, detects pre-hydration failures) and `.editorial-embed iframe` wrappers (`is-loading` → `is-ready`/`is-error`, with a 6s timeout so CSP-blocked frames cannot spin forever). The legacy `data-src` lazy-activation path is preserved.
- `src/app/globals.css`: replaced the Spotify `:has()` rule with the two modifier-class heights (152px/352px), gave `img.is-error` a placeholder gradient, updated the embed error message to "Media unavailable", and styled `.editorial-embed-fallback`.
- `next.config.ts`: CSP `frame-src` now allows `https://w.soundcloud.com` and `https://soundcloud.com`.
- `scripts/test-effective-image-url.mjs`: assertions updated for the pass-through behavior.
- `tests/e2e/article-media.spec.ts`: new Playwright spec covering inline image settle states, no unstyled broken images, local media overrides, and embed wrapper states/Spotify heights. Run with `npm run test:e2e -- article-media`.

## What this does not fix (needs infra)

The 604 current-article media references still point at `https://radarcharts.net/wp-content/uploads/...`, which 404s until the paused current-media → R2 migration completes (blocked on the archived/quota-exceeded Neon branch and missing R2 runtime credentials). Until then, featured/archive images show the branded gradient placeholder and inline images show the styled `is-error` placeholder instead of broken-image icons. `scripts/qa-all-editorial-images.mjs` will keep reporting failed image responses for these articles until the migration rewrites the stored URLs; that is expected.

Verified during diagnosis: R2 serves legacy media (`pub-2d7f41f7140544c480801d8b90da765e.r2.dev`), has no `current-media/` objects yet, and Photon (`i0.wp.com`) fails for all radarcharts.net paths including cache-era 2025 uploads.
