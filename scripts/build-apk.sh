#!/usr/bin/env bash
#
# Build the signed Android APKs (mobile + tv flavours) for RADARSite.
#
# This is the ONLY supported way to produce a release artifact (invariant I8:
# artifacts are derived, not hand-edited).
#
# Prerequisites: JDK 21, Android SDK (platforms;android-36, build-tools;36.0.0).
# Run from the repository root:  ./scripts/build-apk.sh [--debug-only]
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DEBUG_ONLY="${1:-}"
OUT="$ROOT/evidence/build-output"
mkdir -p "$OUT"

log() { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# --------------------------------------------------------------- preflight
command -v java >/dev/null || die "java not found. Install JDK 21."
JAVA_MAJOR="$(java -version 2>&1 | head -1 | sed -E 's/.*version "([0-9]+).*/\1/')"
[ "${JAVA_MAJOR:-0}" -ge 21 ] || die "JDK 21+ required, found ${JAVA_MAJOR:-unknown}."

[ -n "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ] || die \
  "ANDROID_HOME / ANDROID_SDK_ROOT not set. Install the Android SDK command-line tools."

log "Syncing the TV navigation bundle into the shell assets"
if command -v npx >/dev/null && [ -d "$ROOT/tv-nav" ]; then
  ( cd "$ROOT" && [ -f node_modules/.bin/esbuild ] && \
    node_modules/.bin/esbuild tv-nav/src/tv-nav.ts --bundle --format=iife \
      --global-name=TvNav --target=es2019 \
      --outfile=android/app/src/main/assets/public/tv-nav.bundle.js ) || \
    echo "   (esbuild not installed; using committed bundle)"
fi

log "Injecting the shell entry point (offline fallback handled natively by MainActivity)"
cp "$ROOT/android/app/src/main/assets/public/offline.html" \
   "$ROOT/android/app/src/main/assets/public/offline.html" 2>/dev/null || true

# --------------------------------------------------------------- signing
if [ "$DEBUG_ONLY" != "--debug-only" ]; then
  if [ ! -f "$ROOT/android/keystore.properties" ]; then
    cat >&2 <<'MSG'
keystore.properties is missing — a RELEASE APK must be signed.

Generate one first (the owner must keep the .jks and the password safe;
losing it means you can never update the app on Play again):

  ./scripts/gen-keystore.sh

Then re-run ./scripts/build-apk.sh
MSG
    die "release build aborted: no signing config"
  fi
fi

# --------------------------------------------------------------- build
cd "$ROOT/android"

if [ "$DEBUG_ONLY" = "--debug-only" ]; then
  log "Building DEBUG APKs (unsigned-by-release-standard, installable for testing)"
  ./gradlew --no-daemon assembleMobileDebug assembleTvDebug
  TASKS_DONE=1
else
  log "Building RELEASE APKs for both flavours"
  ./gradlew --no-daemon assembleMobileRelease assembleTvRelease
  TASKS_DONE=1
fi

# --------------------------------------------------------------- collect
log "Collecting artifacts"
shopt -s nullglob
found=0
for f in "$ROOT"/android/app/build/outputs/apk/*/*/*.apk; do
  base="$(basename "$f")"
  cp "$f" "$OUT/$base"
  found=$((found + 1))
done
[ "$found" -gt 0 ] || die "no APK produced — check the Gradle output above."

log "SHA-256 checksums"
# Emit a NORMALIZED checksum list: bare filenames, no "./" prefix, sorted by
# name, so the file is byte-identical regardless of the shell's glob order and
# can be verified from any directory with `sha256sum -c SHA256SUMS`.
# `sha256sum ./*.apk` would otherwise write "./radarsite-mobile.apk", which
# breaks consumers that compare the recorded path to a bare filename.
( cd "$OUT" && sha256sum ./*.apk | sed 's| \./| |' | LC_ALL=C sort -k2 > SHA256SUMS && cat SHA256SUMS )

# Machine-readable manifest, with the git state the artifact came from.
GIT_SHA="$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo unknown)"
GIT_BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
GIT_DIRTY="$(git -C "$ROOT" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"

cat > "$OUT/build-manifest.json" <<EOF
{
  "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "gitSha": "$GIT_SHA",
  "gitBranch": "$GIT_BRANCH",
  "dirtyFiles": $GIT_DIRTY,
  "minSdk": 24,
  "targetSdk": 36,
  "compileSdk": 36,
  "flavours": ["mobile", "tv"],
  "apks": [
$(cd "$OUT" && for f in ./*.apk; do
  printf '    {"file":"%s","bytes":%s,"sha256":"%s"}' \
    "$(basename "$f")" "$(stat -c%s "$f")" "$(sha256sum "$f" | cut -d' ' -f1)"
  [ "$f" != "$(ls ./*.apk | tail -1)" ] && printf ','
  printf '\n'
done)
  ]
}
EOF

log "Done. Artifacts in evidence/build-output/"
ls -la "$OUT"
