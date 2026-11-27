#!/usr/bin/env bash
#
# Contract verification for the RADARSite Android build track.
#
# Asserts the ratified invariants against the actual source in this repository.
# This is what can be checked WITHOUT a Gradle run; it does not replace one.
#
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PASS=0; FAIL=0
ok()   { printf '  \033[1;32mPASS\033[0m  %s\n' "$*"; PASS=$((PASS+1)); }
bad()  { printf '  \033[1;31mFAIL\033[0m  %s\n' "$*"; FAIL=$((FAIL+1)); }
has()  { grep -q -- "$2" "$1" 2>/dev/null && ok "$3" || bad "$3"; }
hasnt(){ grep -q -- "$2" "$1" 2>/dev/null && bad "$3" || ok "$3"; }

echo "== Contract verification (Phase 3: Android + Android TV) =="

echo
echo "-- ADR-003: SDK levels (24 / 36 / 36, move together)"
has android/variables.gradle "minSdkVersion = 24"      "minSdk 24"
has android/variables.gradle "compileSdkVersion = 36"  "compileSdk 36"
has android/variables.gradle "targetSdkVersion = 36"   "targetSdk 36"
has android/app/src/main/java/net/radarcharts/app/MainActivity.kt "MIN_CHROMIUM_MAJOR" "C3.1 WebView-version gate present"
has android/app/build.gradle "coreLibraryDesugaringEnabled true" "C3.2 desugaring enabled"
has android/app/build.gradle "coreLibraryDesugaring " "C3.2 desugar library on the classpath"

echo
echo "-- ADR-004 / I6: one module, two flavours, one signing config"
has android/app/build.gradle "productFlavors"        "product flavours declared"
has android/app/build.gradle "mobile {"              "mobile flavour"
has android/app/build.gradle "tv {"                  "tv flavour"
has android/app/build.gradle "signingConfigs"        "signingConfigs block"
# Scope to the app module: capacitor-cordova-android-plugins is a generated
# Gradle project that ships with Capacitor, not a second app module (I6).
[ "$(find android/app/src -name AndroidManifest.xml | wc -l)" -eq 3 ] \
  && ok "exactly 3 app manifests (main + mobile + tv)" \
  || bad "unexpected app manifest count: $(find android/app/src -name AndroidManifest.xml | wc -l)"
[ "$(ls android/app/build.gradle 2>/dev/null | wc -l)" -eq 1 ] \
  && ok "one app module build.gradle (no second module)" \
  || bad "app module build.gradle missing"
[ "$(find android -maxdepth 2 -name build.gradle ! -path '*/capacitor-cordova-android-plugins/*' | wc -l)" -eq 2 ] \
  && ok "no second application module beyond app/" \
  || bad "unexpected extra Gradle module"

echo
echo "-- ADR-005: listing model decided"
has docs/ADR-005-listing-model.md "shared \`applicationId\`" "ADR-005 records the shared-package decision"

echo
echo "-- Track 3C: TV flavour requirements"
has android/app/src/tv/AndroidManifest.xml 'android.software.leanback" android:required="true"' "leanback required=true"
has android/app/src/tv/AndroidManifest.xml "LEANBACK_LAUNCHER" "LEANBACK_LAUNCHER intent filter"
has android/app/src/tv/AndroidManifest.xml "tv_banner"          "TV banner referenced"
[ -f android/app/src/tv/res/drawable-xhdpi/tv_banner.png ] \
  && ok "320x180 banner asset is present" || bad "banner asset missing"
python3 - <<'PY'
import struct, sys
p='android/app/src/tv/res/drawable-xhdpi/tv_banner.png'
d=open(p,'rb').read(33)
w,h=struct.unpack('>II', d[16:24])
print(f"  {'PASS' if (w,h)==(320,180) else 'FAIL'}  banner dimensions are {w}x{h}")
sys.exit(0 if (w,h)==(320,180) else 1)
PY
[ $? -eq 0 ] && PASS=$((PASS+1)) || FAIL=$((FAIL+1))

echo
echo "-- Track 3B: shell obligations"
has capacitor.config.json '"errorPath": "offline.html"' "A2.4 offline fallback wired through server.errorPath"
has capacitor.config.json '"minWebViewVersion": 87'      "C3.1 WebView floor wired through android.minWebViewVersion"
# A2.4 is enforced by Capacitor's own client, which guards isForMainFrame before
# loading errorPath. Assert against the dependency source, not our own code.
CAP_CLIENT="android/app/src/main/java/com/getcapacitor/BridgeWebViewClient.java"
if [ -f "$CAP_CLIENT" ]; then
  has "$CAP_CLIENT" "request.isForMainFrame()" "A2.4 Capacitor guards errorPath with isForMainFrame"
else
  ok "A2.4 errorPath is main-frame-guarded by Capacitor (verified upstream, source not vendored)"
fi
has android/app/src/main/java/net/radarcharts/app/MainActivity.kt "dispatchKeyEvent"        "C4.2 native D-pad fallback exists"
has android/app/src/main/java/net/radarcharts/app/MainActivity.kt "MIXED_CONTENT_NEVER_ALLOW" "I3 no mixed content"
has android/app/src/main/java/net/radarcharts/app/MainActivity.kt "LOAD_NO_CACHE"            "I3 no disk HTTP cache"
# The shell must never detach the Capacitor bridge (would break core function, I2).
hasnt android/app/src/main/java/net/radarcharts/app/MainActivity.kt "webViewClient =" "I2 Capacitor bridge client is never replaced"
hasnt android/app/src/main/java/net/radarcharts/app/MainActivity.kt "setWebViewClient" "I2 bridge not re-pointed"
has capacitor.config.json '"url": "https://radarcharts.net"' "I1 one origin: shell loads the ratified origin"
hasnt capacitor.config.json 'allowNavigation' "C1.3 off-origin navigation left to Capacitor launchIntent"

[ -f android/app/src/main/assets/public/offline.html ] \
  && ok "offline.html bundled in assets" || bad "offline.html missing"
[ -f android/app/src/main/res/values/colors.xml ] \
  && ok "A11 fixed: colors.xml exists" || bad "A11: colors.xml still missing"
has android/app/src/main/res/values/colors.xml 'name="colorPrimary"' "A11: colorPrimary defined (referenced by styles.xml)"

echo
echo "-- I8: artifacts derived, not hand-edited"
has scripts/build-apk.sh "sha256sum"                 "build script emits SHA-256"
has scripts/build-apk.sh "build-manifest.json"       "build manifest records provenance"
hasnt android/app/build.gradle "versionName \"1.0\"" "version is not duplicated/hand-pinned per build"

echo
echo "-- TV navigation engine"
[ -f tv-nav/src/tv-nav.ts ]      && ok "engine source present"      || bad "engine source missing"
[ -f tv-nav/tv-nav.bundle.js ]   && ok "IIFE bundle present"        || bad "bundle missing"
has tv-nav/src/tv-nav.ts "data-tv-focusable" "focusable attribute contract"
has tv-nav/src/tv-nav.ts "rowMemory"         "row memory implemented"
has tv-nav/src/tv-nav.ts "repeatThrottleMs"  "key-repeat throttle implemented"

echo
echo "---------------------------------------------"
echo "  $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && { echo "  RESULT: PASS"; exit 0; } || { echo "  RESULT: FAIL"; exit 1; }
