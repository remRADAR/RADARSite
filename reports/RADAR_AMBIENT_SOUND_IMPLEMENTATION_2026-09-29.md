# RADAR Ambient Sound Engine — Implementation Report

**Date:** 2026-09-29  
**Scope:** CMS integration development branch only  
**Production deployment:** Not performed  
**Production merge:** Not performed

## Implemented

A centralized, client-side `RadarAmbientEngine` now owns the site-wide ambient layer. The existing `PlaylistFloater` remains in place as the visual standby control, but it no longer embeds or auto-starts the old YouTube playlist.

The implementation uses an original procedural Web Audio placeholder rather than Apple audio, a copyrighted recording, or an unlicensed downloaded asset. It produces restrained oscillator-based atmospheric beds locally in the browser. The architecture keeps period profiles isolated so approved RADAR audio assets can replace or extend the profiles later without adding a public track-selection UI.

## Existing standby-player audit

Before this change, `src/components/marketing/PlaylistFloater.tsx`:

- rendered a hidden YouTube playlist iframe;
- loaded it with `autoplay=1&mute=1`;
- attempted to unmute and play on iframe load, page show, and visibility changes;
- interpreted YouTube postMessage states as local `PLAYING`, `PAUSED`, `LOADING`, or `ERROR` UI state;
- persisted a session-level playing preference;
- exposed a draggable floating play/pause button.

It created its own external media source and could become a competing background layer.

After this change:

- the same draggable floating control remains in the same general placement and visual language;
- there is no standby YouTube iframe and no forced audio autoplay;
- before activation it reads **Enter RADAR — activate ambient sound**;
- activation calls the engine from the click gesture that browsers use for audio permission;
- after activation it reads **Silence RADAR ambient sound**;
- no playlist track or day/night selector is exposed;
- the old playlist cannot continue as a competing background source;
- an accessible volume control is available only after activation and is capped at 55%.

## Engine architecture

`src/lib/radar-ambient-engine.ts` exports:

- `RadarAmbientEngine` — one browser-side controller instance;
- `radarAmbientEngine` — the module singleton used by the standby control;
- `clampAmbientVolume` — hard-ceiling invariant;
- `getAmbientPeriod` — browser-local period selection;
- `MAX_AMBIENT_VOLUME = 0.55`;
- five period profiles: early morning, daytime, evening, night, and late night.

The engine owns one master `GainNode`. A period source is a small controlled group of oscillators routed through a low-pass filter. Period changes cross-fade the outgoing and incoming groups over 2.6 seconds; the previous group is stopped and disconnected after the fade. This temporary two-source overlap is limited to the actual transition.

The singleton is mounted under the existing marketing layout, so client-side navigation does not create another engine or restart the source. Full reloads return to an inactive, ready state and require a fresh explicit gesture.

## Activation and autoplay behavior

1. The site loads with no audible ambient audio.
2. The existing standby control is visible.
3. The visitor explicitly taps or clicks Enter RADAR.
4. The engine creates/resumes `AudioContext` and verifies that its state is `running`.
5. Only after successful browser activation does it create the period source and fade the master gain up.
6. If `AudioContext.resume()` is rejected or remains suspended, the control returns to a ready/error state; it does not claim playback and does not repeatedly retry.
7. A visitor who silences audio is not automatically reactivated by navigation, visibility changes, or foreground-media changes.

## Volume rules

- Default level: 30%.
- Absolute maximum: 55%; the clamp is applied inside the engine and the range input has `max="55"`.
- The visitor can reduce the level to zero in 5% steps.
- The current session volume is stored in `sessionStorage` and reused by the singleton.
- Foreground media and period transitions use the stored lower level; they never reset it to 55%.

## Time-aware atmosphere

The period selector uses `Date#getHours()` in the visitor’s browser. It never uses the server timezone or a single global timezone:

| Local browser time | Period |
|---|---|
| 05:00–07:59 | Early morning |
| 08:00–16:59 | Daytime |
| 17:00–20:59 | Evening |
| 21:00–00:59 | Night |
| 01:00–04:59 | Late night |

This means visitors in Abuja and London are evaluated using their respective device/browser local clocks. No geolocation permission is requested. Sunrise/sunset data is therefore not used in this first safe implementation; fixed local periods are the privacy-preserving fallback until an approved solar-data strategy and product decision are available.

## Foreground media priority

The engine listens once, at document/window level, for:

- native HTML audio/video `play`, `pause`, and `ended` events;
- YouTube-style provider `postMessage` state events;
- custom `radar:foreground-media` events for existing or future RADAR media players.

It tracks active foreground identities in a set. Ambient gain fades to zero while any relevant media is active. It fades back toward the visitor’s selected level only after the set is empty. Two simultaneous foreground elements therefore keep ambient muted until both stop.

## Accessibility and performance

- Native buttons remain keyboard accessible.
- Activation, silence, retry, and volume controls have explicit accessible labels.
- A polite live region communicates activation, period, foreground muting, and error state.
- Ambient audio is never required to understand or navigate the site.
- No audio network request or large asset delays first render.
- No audio iframe is rendered by the standby player.
- The engine is created lazily after user activation.
- Reduced-motion CSS is retained for the control spinner; audio cross-fades are functional state transitions rather than visual requirements.

## Files changed

- `src/lib/radar-ambient-engine.ts`
- `src/components/marketing/PlaylistFloater.tsx`
- `scripts/radar-ambient-contract-test.ts`
- `tests/e2e/ambient.spec.ts`
- `package.json`
- `reports/RADAR_AMBIENT_SOUND_IMPLEMENTATION_2026-09-29.md`

## Verification performed

| Check | Result |
|---|---|
| `npm ci --no-audit --no-fund` | Passed on the CMS branch |
| `npm run test:ambient` | Passed: period boundaries and volume clamp |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed with one existing unrelated `<img>` warning in `src/components/admin/CmsStudioPanel.tsx` |
| `npx playwright test tests/e2e/ambient.spec.ts --workers=1` | Passed: 3 tests |
| `npm run build` | Passed: 384/384 static pages generated |
| `git diff --check` | Passed |

The browser tests use a deterministic mocked `AudioContext` to verify engine state transitions. They prove UI/controller behavior, not physical speaker output. Actual listening tests remain a human/device validation step.

## Exact isolated Preview validation procedure

No Preview deployment was created in this task. When an explicitly approved isolated Preview is available:

1. Use only the CMS integration Preview environment and its approved non-production credentials.
2. Confirm the Preview URL and branch before opening it; do not use the Production alias.
3. Open the site in desktop Chrome, desktop Safari, Firefox, iOS Safari, and Android Chrome.
4. Confirm initial load is silent and the Enter RADAR control is visible.
5. Activate once and confirm the ambient layer begins only after the gesture.
6. Set volume to 55%, 30%, 0%, and a lower value; confirm the UI never permits a value above 55%.
7. Start one native audio/video element, then two; confirm ambient fades out and stays muted until all foreground media stops.
8. Navigate through articles, RADARArticles, Magazine, Motherland, and another public route; confirm the engine does not restart or duplicate.
9. Wait across a local period boundary or use an isolated test clock; confirm gradual transition rather than abrupt replacement.
10. Repeat activation with browser autoplay restrictions enabled and document the actual Safari/iOS result.

## Known limitations

- Physical audio output was not verified by automated tests.
- This implementation uses original procedural placeholder sound, not final RADAR audio assets.
- Period selection currently uses local clock windows rather than geolocation-derived sunrise/sunset data.
- Cross-origin providers can only be muted when their provider emits a recognizable state message or a RADAR integration dispatches the custom event.
- Real-device Safari/iOS, Firefox, Android Chrome, and final listening quality remain Preview/human validation work.

## Safety boundary

This work was performed on local branch `radar-ambient-sound-engine`, based on `origin/cms-integration-2026-09-29`. No Vercel deployment, production branch, production database, Neon, Supabase Production, WordPress, R2, redirects, DNS, migration state, or production media was modified.
