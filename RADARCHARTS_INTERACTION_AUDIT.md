# RADARCharts Interaction Engineering Audit

**Audit date:** 2026-09-11  
**Scope:** `https://radarsite-two.vercel.app/` and the enabled source repository `remRADAR/RADARSite` at commit `0051f30`  
**Status:** **AUDIT COMPLETE — IMPLEMENTATION NOT STARTED**

## Scope and evidence boundary

The deployed URL responded successfully with HTTP 200 from Vercel and exposed a Next.js App Router application. The selected repository named `remRADAR/https-github.com-remRADAR-radarcharts-framer-migration` could not be resolved by the authenticated GitHub CLI and is not present in the accessible organization repository list. The audit therefore uses the deployed site and `remRADAR/RADARSite` as the evidence base. This report does not claim findings for an unavailable repository.

The source tree already contains prior hardening and responsive-audit work, including `SECURITY_PERFORMANCE_REPORT.md`, Playwright tests, responsive scripts, reduced-motion handling, and error-boundary work. Those documents are treated as repository claims; runtime checks below distinguish directly observed facts from prior claims.

## Executive summary

The application has a coherent Next.js/Tailwind/GSAP architecture and meaningful existing quality coverage. The most important interaction mismatches are concentrated in two areas:

1. **Hero carousel:** the implementation renders only the active `next/image` and changes it with a keyed component. There is no pair of overlapping images or opacity transition between outgoing and incoming slides. This does not satisfy the requested smooth cross-fade and can expose a replacement-frame flash under slow image delivery or an image error.
2. **Global playlist control:** the control embeds a hidden YouTube playlist and sends `playVideo`, `pauseVideo`, and `unMute` commands, but it does not subscribe to YouTube IFrame Player API state events. The visual state is therefore based on local intent/session storage, not confirmed player state. Loading, buffering, unavailable media, autoplay rejection, track changes, and playback errors are not represented distinctly. The requested 12-second track cross-fade is not technically implemented and should not be faked.

Other areas are comparatively strong: timers and listeners observed in the inspected components have cleanup paths, the code includes reduced-motion handling, image dimensions and priority loading are used in the hero, keyboard-visible focus classes exist in key navigation paths, and the repository has targeted end-to-end coverage. Remaining issues include limited runtime observability of console warnings and Web Vitals in the available baseline, a missing explicit transition lock/preload strategy for the hero, and several deliberate non-wrapping typography rules that require viewport verification rather than assumption.

## 1. Console health and runtime stability

### Evidence observed

- The deployed HTML returned HTTP 200 with a valid `RADARCharts by REM` title.
- The response included a strict Content Security Policy, HSTS, `X-Content-Type-Options`, referrer, frame, and permissions policies.
- The repository includes route/root error-boundary work and Playwright tests that collect `pageerror` and console errors for the homepage and scroll flows.
- The repository's prior `SECURITY_PERFORMANCE_REPORT.md` states that `npm run lint`, `npx tsc --noEmit`, and `npm run build` passed in its documented verification run. A fresh run was started for this audit; its result is recorded separately when complete.

### Not established in this audit

- A complete browser-console session against every route was not available from the static HTTP response alone. Server-rendered HTML contains Next.js error-boundary wiring, but that is not evidence of a runtime error.
- No fresh Lighthouse report or field Web Vitals/RUM sample was available in the repository or response.
- The local environment has Chromium and Playwright, but no `lighthouse` executable was found during the tool check.

### Required implementation-phase checks

Run a fresh Playwright matrix against the local build and deployed preview, capturing `pageerror`, console `error` and `warning`, failed requests, hydration warnings, and media load failures for `/`, `/work`, `/about`, `/radarmusic`, `/ontheradar`, `/dashboard`, and `/login`. Do not suppress warnings; classify and fix their causes.

## 2. Architecture map

| Concern | Current implementation | Audit assessment |
|---|---|---|
| Framework | Next.js App Router, TypeScript, Tailwind CSS v4 | Coherent; preserve architecture |
| Content/config | Typed content in `src/lib/radar-content.ts`, case studies, and site overrides | Existing override snapshot model is hydration-aware |
| Hero | `src/components/marketing/Hero.tsx`; `next/image` with `fill`, `sizes="100vw"`, `priority`, local fallback on `onError` | Requires true overlapping cross-fade and preload strategy |
| Scroll/motion | GSAP + ScrollTrigger; Lenis driven from one GSAP ticker in `SmoothScrollProvider` | Existing cleanup/reduced-motion approach is a good base |
| Logo/gallery carousels | `src/components/motion/DragCarousel.tsx` and GSAP Draggable enhancement | Existing tests verify overflow and draggable wiring; this is separate from the hero photo carousel |
| Global player | `src/components/marketing/PlaylistFloater.tsx`; hidden YouTube playlist iframe with `enablejsapi=1` and postMessage commands | Local intent state only; no authoritative player-state bridge |
| Navigation | `SiteHeader`, Next links, mobile menu state | Existing focus and responsive tests; verify active-state and menu transition behavior in browser |
| Error recovery | Route/root error boundaries are documented in prior hardening report | Verify fresh runtime behavior and retry paths |
| Testing | Playwright e2e suite plus responsive audit scripts | Good foundation; add hero cross-fade and player-state tests |

## 3. Interaction weak points

### P0 — Hero is not a cross-fade

In `src/components/marketing/Hero.tsx`, the rendered image is selected from `slides[active]` and given `key={slide.id}`. A new `Image` replaces the old one when the interval updates `active`; there are not two concurrently rendered image layers with controlled opacity. The current class is positioned but has no transition or animation controlling opacity. This is a direct mismatch with the brief's requirement for an outgoing/incoming overlap.

**Risk:** abrupt replacement, a blank or fallback frame while a new image loads, and inconsistent behavior when a timer tick occurs during a manual future interaction. The existing `onError` fallback handles a failed image after the fact, but it does not guarantee a no-flash transition.

**Required fix direction:** maintain current and next slide layers, preload the next source, wait for load readiness where practical, cross-fade only after the incoming image is ready, guard transitions with a ref/token, and clean up interval/listeners. Preserve `next/image`, fixed aspect/hero bounds, all configured slides, and reduced-motion behavior.

### P0 — Player UI does not reflect confirmed playback state

`PlaylistFloater.tsx` sets `playing` immediately after sending a YouTube command and persists that intent in `sessionStorage`. It does not register a YouTube IFrame Player API listener or consume `YT.PlayerState`/error events. `onLoad` calls `resumeIfActive`, which also sends commands without a confirmed ready state. The source URL requests `autoplay=1&mute=1`, and the UI initially defaults to an effective playing state on a mounted client when no session value exists.

**Risk:** the button can show Pause while autoplay is blocked, media is buffering, the playlist is unavailable, or the iframe has not accepted the command. A user can also see state drift after a track change or provider-side interruption.

**Required fix direction:** model `IDLE`, `LOADING`, `PLAYING`, `PAUSED`, `BUFFERING/TRANSITIONING`, and `ERROR`; listen to authoritative YouTube events; show loading/disabled/error affordances; handle autoplay rejection with a user-initiated fallback; and only label the control as playing after a confirmed playing event. Keep optimistic press feedback separate from the authoritative playback status.

### P1 — Track cross-fade is not feasible in the current single-iframe design

The current player uses one YouTube playlist iframe. The source contains no dual-player or Web Audio mixing implementation. A true 12-second overlap requires two controllable audio sources with reliable volume control and track-boundary knowledge; the current architecture cannot provide that safely. The implementation must not claim a cross-fade unless the architecture is changed and tested.

**Recommended fallback:** explicit limitation plus reliable provider-controlled track transitions, or a short fade-out/fade-in only if provider controls and event timing can be made authoritative. Do not simulate a 12-second cross-fade through UI animation.

### P1 — Hero readiness and transition race safety are incomplete

The hero interval advances independently of image readiness and there is no transition-in-progress lock, next-image preload, or cancellation token. The timer itself is cleaned up on unmount, and reduced motion disables the interval, which are positive findings. Manual controls are not present in the inspected hero component, so the brief's manual-vs-automatic interaction requirement is not yet exercised by this implementation.

### P1 — Drag interaction shares the player button's activation surface

The playlist control uses the same `<button>` for pointer dragging and play/pause activation. This is touch-friendly in that it uses pointer events and pointer capture, but a short drag may also activate the button depending on browser gesture timing. The implementation phase should distinguish click/tap from drag distance and use `onPointerUp`/`onClick` coordination, while retaining keyboard activation for the button.

### P2 — Motion system is broad and must be performance-checked, not expanded indiscriminately

GSAP, ScrollTrigger, Lenis, marquee motion, parallax, and hover transforms are already present. The code comments indicate an intentional single ticker and lag-smoothing strategy. Any new interaction should remain on transform/opacity, avoid layout-triggering properties, and be disabled or simplified under `prefers-reduced-motion`.

## 4. Typography and text layout

### Positive findings

The inspected code uses `clamp()` extensively for hero, section, and application headings. The hero uses `max-w-[11ch]` and the supporting copy has a bounded maximum width. The repository has a dedicated punctuation-responsive test and recent commits addressing punctuation attachment and responsive interaction.

### Risk areas requiring browser verification

- `PillarsSection.tsx` deliberately applies `whitespace-nowrap`, `word-break: keep-all`, and `overflow-wrap: normal` to large labels. This preserves editorial word integrity but can overflow or become cramped at narrow widths if content overrides are longer than the seeded labels.
- Several routes intentionally include source `<br />` tags in editorial headings, including `radarmusic/page.tsx`, `ontheradar/page.tsx`, and a dashboard heading. These are existing content decisions and should be reviewed against the brief's prohibition on arbitrary line forcing. Replace only arbitrary layout breaks; preserve semantic editorial line treatment if it is an intentional content structure.
- `PlaylistFloater` tooltip text uses `whitespace-nowrap`; long admin-configured playlist labels may escape the viewport.

**Required check:** exercise seeded and override content at 320, 360, 390, 430, 768, 1024, 1280, and 1440px widths, including long labels and system font scaling. Fix containers with responsive sizing/wrapping rather than inserting new arbitrary breaks.

## 5. Performance baseline

### Available evidence

- Hero images use `next/image`, fixed fill layout, `sizes="100vw"`, and `priority` on the rendered hero image.
- The response is served from Vercel with `x-vercel-cache: HIT` and a prerender marker.
- The repository's prior report documents responsive checks and says the hero assets are WebP; those are repository claims, not a newly measured Web Vitals sample.

### Metrics status

| Metric | Status | Why |
|---|---|---|
| LCP | **Not measured fresh** | No Lighthouse/RUM result captured in this audit |
| CLS | **Not measured fresh** | Static source suggests image dimensions/fill are considered, but no trace was captured |
| INP | **Not measured fresh** | Requires browser interaction trace or field data |

Use the target thresholds **LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms** for the implementation QA gate. Capture a controlled mobile and desktop run after changes and compare against this baseline status rather than inventing numeric values.

## 6. Accessibility and responsive readiness

- Native links and buttons are used in the inspected interaction components.
- The hero background image has descriptive `alt` text; the ticker icon is decorative with empty alt text.
- The playlist iframe has a title, and the control has a dynamic accessible label.
- Existing code includes `focus-visible` styling in key interactive areas and reduced-motion branches in hero/scroll motion.
- The playlist button's 48px size is appropriate for touch, but its draggable behavior needs a tap-vs-drag distinction and its status needs an accessible loading/error announcement.
- The hero background is marked `aria-hidden` at its container even though the image itself has alt text; this is internally inconsistent. Decide whether the hero photo is decorative (empty alt and hidden) or informative (not hidden), then apply one clear semantic choice.
- The hidden one-pixel iframe is an unusual media accessibility pattern. Confirm it does not create confusing focus or screen-reader output and expose a clear text status for unavailable/loading playback.

## 7. Implementation plan after approval

1. **Errors and instrumentation:** run fresh lint/typecheck/build plus Playwright console/request capture; fix legitimate findings first.
2. **Hero safety:** implement two-layer readiness-gated cross-fade with fallback, transition token/lock, timer cleanup, reduced-motion branch, and tests for all configured images.
3. **Player truthfulness:** add a provider event bridge and explicit state machine; separate interaction feedback from confirmed playback; add autoplay/error/loading UI and cleanup.
4. **Typography/navigation polish:** verify content overrides, menu transitions, active states, focus visibility, and touch behavior across the required viewport matrix.
5. **Performance and visual QA:** capture traces/screenshots, measure LCP/CLS/INP where tooling permits, and verify no layout shift or frame regression.
6. **Final report:** document the true player limitation and only claim fixes supported by test evidence.

## 8. Acceptance gates

- [ ] Fresh console/runtime audit has no legitimate errors or hydration warnings on required routes.
- [ ] Hero shows a real overlapping cross-fade with no blank/black/white replacement frame on normal and slow image delivery.
- [ ] Hero preserves every configured image and has a tested failure fallback.
- [ ] Player status is confirmed from actual provider events and distinguishes loading, playing, paused, buffering/transitioning, and error.
- [ ] Autoplay failure produces a user-initiated recovery path.
- [ ] No unsupported 12-second track cross-fade claim; limitation is documented unless dual-source mixing is implemented and verified.
- [ ] Typography remains intentional at mobile, tablet, and desktop sizes without new arbitrary `<br>` tags.
- [ ] Reduced motion, keyboard focus, touch targets, and drag-vs-tap behavior pass checks.
- [ ] Lint, typecheck, build, targeted e2e tests, and visual checks pass.

## Decision requested

The mandatory Phase 1 audit is complete. Implementation should begin only after the audit boundary and the two P0 decisions are accepted: **(a)** implement a true readiness-gated hero cross-fade, and **(b)** make the player state authoritative even if the final architecture must document that a true 12-second track cross-fade is not feasible with one YouTube iframe.


## Baseline verification update

The fresh repository checks completed successfully after dependency installation:

| Check | Result |
|---|---|
| `npm run lint` | Passed with exit code 0 |
| `npx tsc --noEmit` | Passed with exit code 0 |
| `npm run build` | Passed with exit code 0; Next.js generated all listed routes successfully |

No source implementation changes were made during the audit. The only working-tree addition is this audit report.
