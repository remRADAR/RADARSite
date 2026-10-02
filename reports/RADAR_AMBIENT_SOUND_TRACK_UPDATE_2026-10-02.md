# RADAR Ambient Sound Track Update — 2026-10-02

## Scope

Replace the daylight-aware procedural ambient sound with the supplied `Backgroundsound.mp3` as the only site-wide background track. This is a local code and asset change; no Production deployment or database mutation is included.

## Asset

- Source: user-supplied `/home/ubuntu/upload/Backgroundsound.mp3`
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

## Files changed

- `public/audio/backgroundsound.mp3`
- `src/lib/radar-ambient-engine.ts`
- `src/components/marketing/PlaylistFloater.tsx`
- `scripts/radar-ambient-contract-test.ts`
- `tests/e2e/ambient.spec.ts`

## Verification

- `ffprobe` confirmed the supplied MP3 is readable and has the metadata above.
- Contract test, TypeScript, lint, targeted Playwright ambient tests, and production build are still to be rerun after this update.
- Physical listening quality and real-device browser audio behavior remain Preview/human validation items.

## Safety

- No Production variables, databases, R2 objects, WordPress content, DNS, or live domains were changed for this track update.
- The previously approved staging Preview-only `R2_PUBLIC_BASE_URL` change is unrelated and remains isolated to the `radarsite-staging` Preview environment.
