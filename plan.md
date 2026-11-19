# About Page: RADAR Explore + Founder Pass

## Goal

Turn `/about` into a clean two-frame experience. Frame one is the existing RADAR Explore image component. Frame two is the branded interactive founder pass. The founder pass opens a compact highlight box when clicked or tapped. Ecosystem content stays on a separate, concise `/about/ecosystem` page and is linked as a simple tab from About.

## Design direction

- **Selected movement:** cinematic editorial interface with a dark gallery canvas, fluorescent flare accents, and physical card motion.
- **Core principles:** image-led, minimal copy, interaction before explanation, mobile-first clarity.
- **Color philosophy:** near-black and paper-white make the supplied image and founder pass feel archival; the existing flare green marks active signals and links.
- **Layout paradigm:** stacked frames with a continuous visual sequence rather than a dense information grid.
- **Signature elements:** numbered signal points, thin technical rules, and the hanging pass as a tactile object.
- **Interaction philosophy:** the image and pass reveal context only after selection; no visible instructional paragraphs surround the pass.
- **Animation:** retain RADAR Explore directional zoom; retain the pass swing; use a short opacity/translate reveal for the founder panel; honor reduced motion.
- **Typography system:** existing display face for high-impact titles, existing mono face for labels and metadata, small founder-card type so the pass reads as an object rather than a poster.
- **Brand essence:** RADARCharts by REM is an artist-first music ecosystem that protects the music and makes the surrounding work visible. Personality: direct, tactile, culture-led.
- **Brand voice:** short, declarative, and ownable. Example: `ENTER THE RADAR.` / `PROTECT THE MUSIC.`
- **Signature brand color:** the existing flare green.

## Implementation

- Keep `RadarExplore` as frame one and do not add the founder pass inside it.
- Add `FounderFrame` as frame two, wrapping the existing `FounderLanyard` and a dismissible founder detail dialog.
- Extend `KernLanyardPass` with an optional activation callback so the moving pass can open the dialog without adding visible helper copy.
- Reduce the pass name and metadata font sizes, change the pass identity to REM, and set the reverse line to `REM`.
- Keep the current founder portrait as a temporary asset until the user supplies the replacement image.
- Add a minimal ecosystem tab linking to `/about/ecosystem`.
- Keep `/about/ecosystem` as one concise page with five clear lanes and no deep navigation.

## Project structure

- `src/app/(marketing)/about/page.tsx`: stacked About frames and ecosystem tab.
- `src/components/marketing/RadarExplore.*`: first frame image exploration.
- `src/components/marketing/FounderFrame.*`: second frame, pass activation, and detail dialog.
- `src/components/marketing/FounderLanyard.*`: pass wrapper and visual configuration.
- `src/components/marketing/KernLanyardPass.jsx`: reusable pass interaction and optional activation callback.
- `src/app/(marketing)/about/ecosystem/page.tsx`: concise ecosystem destination.
- `public/images/about/`: supplied Explore image and future founder replacement asset.


# Cross-platform web app hardening

## Goal

Keep RADARCharts as one canonical Next.js web app that installs cleanly to an iOS Home Screen and Android launcher, remains network-fresh while offering a useful offline fallback, and behaves predictably with Android TV D-pad remotes. CMS/content freshness is the sync contract; no consumer accounts or user-state synchronization are introduced.

## Implementation

- Keep the existing same-origin PWA manifest and add an offline route plus a versioned service-worker strategy: cache the offline shell and app assets, use network-first navigation, and never cache API responses or stale editorial HTML as a substitute for the live origin.
- Add a small lifecycle surface for install/update actions. Android browsers may expose an install prompt; iOS receives concise Home Screen guidance; installed apps receive a safe update action when a new worker is waiting.
- Keep TV navigation progressive rather than replacing native touch/mouse behavior. Improve focus recovery, skip editable controls during arrow traversal, accept common remote activation keys, expose Android-TV detection as a root mode, and strengthen TV-sized focus visibility.
- Do not add Capacitor/TWA/native Android code in this phase: the selected scope is a web app/PWA with CMS freshness, and the repository has no native API requirement or consumer identity model.

## Project structure

- `public/sw.js`: versioned asset/offline strategy and network-first navigation.
- `src/components/PwaLifecycle.tsx`: install/update/offline lifecycle UI.
- `src/components/ServiceWorkerRegistration.tsx`: worker registration and update events.
- `src/components/TVNavigation.tsx`: progressive D-pad and keyboard focus behavior.
- `src/app/offline/page.tsx`: same-origin offline fallback route.
- `src/app/globals.css`: TV-mode focus and minimum target styling.
