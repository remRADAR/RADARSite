# RADAR Ambient Sound Track Update — 2026-10-02

## Scope

Replace the daylight-aware procedural ambient sound with the supplied `Backgroundsound.mp3` as the only site-wide background track. This is a local code and asset change; no Production deployment or database mutation is included.

## Asset

- Source: `Backgroundsound.mp3` carried by the existing single-track audio feature branch.
- Public path: `/audio/backgroundsound.mp3`
- Format: MP3, 40.93 seconds, mono, 22.05 kHz, 128 kbps
- The track loops through one browser-owned `HTMLAudioElement` after an explicit user activation.

## Implemented behavior

- Removed local-clock period selection and the early-morning/daytime/evening/night/late-night profiles.
- Preserved explicit click/tap activation; no autoplay on initial page load.
- Preserved the session volume setting: default 30%, hard maximum 55%, 5% UI steps, and session storage persistence.
- Preserved foreground-media ducking for native audio/video, provider messages, and `radar:foreground-media` events.
- Preserved visibility handling and one singleton engine across client-side navigation.
- Preserved the draggable control and accessibility labels; active status is now `Ambient active` rather than a period name.
- The old YouTube playlist iframe remains absent.
- Fixed a storage parsing edge case where a missing session value (`null`) converted to `0`, silently making the intended 30% default volume zero.
- Deduplicated concurrent activation, disabled the control while activation is pending, provided an explicit retry after autoplay-policy rejection, and reported unexpected playback interruption rather than leaving a false active status.
- Separated drag gestures from click/tap activation so repositioning the floating player cannot start audio; keyboard activation remains available.

## Files changed

- `public/audio/backgroundsound.mp3`
- `src/lib/radar-ambient-engine.ts`
- `src/components/marketing/PlaylistFloater.tsx`
- `scripts/radar-ambient-contract-test.ts`
- `scripts/radar-ambient-preview-check.mjs`
- `tests/e2e/ambient.spec.ts`

## Verification

- `ffprobe` confirmed the supplied MP3 is readable and has the metadata above.
- `npm ci --no-audit --no-fund` — passed.
- `npm run test:ambient` — passed.
- `npx tsc --noEmit` — passed.
- Targeted ESLint on the changed TypeScript files — passed with no warnings.
- `npm run lint` — passed with one pre-existing `<img>` optimization warning in `src/components/admin/CmsStudioPanel.tsx`; no errors.
- `npx playwright test tests/e2e/ambient.spec.ts --workers=1` — all 6 tests passed: explicit activation and source path, 30% default / 55% maximum, asset response, autoplay retry, drag-versus-click, foreground-media ducking, and route persistence.
- `npm run build` — passed; Next.js generated all 459 static pages.
- Built-server smoke test — homepage `200`; track `200`, `audio/mpeg`, 654,941 bytes; MP3 metadata verified as 40.93 seconds.
- Local real-browser preview: `node scripts/radar-ambient-preview-check.mjs` — passed against the running local preview in Chromium without disabling autoplay policy. No audio element or MP3 request existed before activation; after the button click, the actual MP3 loaded and its playback clock advanced. The check also verified 30% default, volume adjustment to the 55% cap, foreground-media ducking/restoration, and fade-to-zero plus pause on Silence.
- The Playwright media element is mocked for deterministic state tests, so those tests do not prove audible output through physical speakers.
- Physical speaker audibility, listening quality, and real-device browser behavior remain human/device validation items.

## Safety

- At the close of the original audio implementation checkpoint, changes remained local and had not been committed, pushed, merged, or deployed. Later remote validation activity is recorded in `docs/PRODUCTION_RELEASE_CHECKLIST.md`.
- No Production variables, databases, R2 objects, WordPress content, DNS, or live domains were changed for this track update.
