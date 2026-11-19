# RADAR Android/PWA continuation handoff

## Current state

Work is on branch `feat/radar-ios-pwa-capacitor-android`, based on the previously reviewed `feat/radar-pwa-tv-hardening` branch. `main` has not been changed. The next agent should continue from the latest commit on this branch.

The RADAR web app remains the canonical Next.js application. The Capacitor shell points to the deployed origin `https://radarcharts.net` because the application is server-rendered and is not a static Next export. `public/index.html` is only a minimal local Capacitor fallback entrypoint; it redirects to the canonical deployed site.

## Completed changes

The PWA is hardened for iOS Home Screen use. The root layout now exports a dedicated viewport with `viewport-fit: cover`, `device-width`, and the dark theme color. The manifest includes the Apple touch icon, standalone display behavior, iOS-safe display overrides, and the existing shortcuts/icons. The service worker now uses version `radar-cache-v3`, pre-caches the public shell and iOS/Android icons, avoids caching private/admin/API/platform navigation, respects `private`/`no-store`/`no-cache` responses, and keeps a useful offline fallback. Standalone PWAs continue receiving update notifications, and the Refresh action activates a waiting worker before reloading.

A Capacitor 8.6.2 Android wrapper has been generated under `android/`. It uses application ID `net.radarcharts.app`, supports ordinary phone launchers and Android TV (`leanback` feature, non-touchscreen devices, `LEANBACK_LAUNCHER`, and a 320x180 RADAR TV banner), and disallows cleartext traffic/mixed content. `capacitor.config.ts` defines the canonical remote URL and Android background color. Package scripts are available:

```bash
npm run cap:sync
npm run android:debug
npm run android:release
npm run android:open
```

## Validation already completed

- `npx cap sync android`: passed.
- `npx cap doctor`: passed with `Android looking great!`.
- `npm test`: passed with 0 errors; the repository retains 10 pre-existing lint warnings.
- Java 21 JDK/compiler was installed in the development environment.

## Remaining blocker

APK compilation was attempted and stopped because the Android SDK is not installed/configured:

```text
SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable or by setting the sdk.dir path in android/local.properties.
```

No APK was produced yet. Installing the Android SDK was intentionally not performed because it requires separate machine-level approval.

## Resume build steps

1. Install Android command-line tools and configure the SDK. The generated project uses compile/target SDK 36 and Gradle 8.14.3 with Android Gradle Plugin 8.13.0. A typical SDK setup is:

```bash
export ANDROID_HOME="$HOME/android-sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
# Install cmdline-tools first using the approved environment/tooling.
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$ANDROID_HOME" \
  "platform-tools" "platforms;android-36" "build-tools;36.0.0"
yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > android/local.properties
```

2. Reinstall project dependencies if starting from a fresh checkout and sync assets:

```bash
npm ci
npx cap sync android
```

3. Build both variants:

```bash
cd android
./gradlew assembleDebug assembleRelease --no-daemon
```

Expected artifacts:

- `android/app/build/outputs/apk/debug/app-debug.apk`
- `android/app/build/outputs/apk/release/app-release-unsigned.apk`

The release APK is currently unsigned. A production-signed APK requires an approved keystore and signing credentials; do not create or commit a keystore or secrets. For Android TV/device testing, use an Android TV emulator or physical TV with ADB and verify D-pad focus, Select/Enter activation, Back behavior, cold launch, rotation, and offline/failure recovery.

4. Final checks:

```bash
npm test
npx cap doctor
node --check public/sw.js
node -e 'JSON.parse(require("fs").readFileSync("public/site.webmanifest", "utf8")); console.log("manifest ok")'
git status --short --branch
```

Do not modify `main` or commit generated APKs unless explicitly requested. APK files are ignored by the Android project rules.
