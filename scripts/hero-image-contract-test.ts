/**
 * RADARSite hero image library contract test.
 * Run: npm run hero:contract-test
 *
 * Validates that every configured hero library entry points at an existing
 * WebP inside public/images/hero/, follows the naming and focal-point
 * conventions, and that the hero always has active slides (library entries
 * or the legacy Drive fallback).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  heroImages,
  HERO_IMAGE_LIBRARY_PUBLIC_PATH,
  isHeroLibraryConfigured,
} from "../src/lib/hero-image-library";
import { getActiveHeroSlides, heroConfig } from "../src/lib/radar-content";

const failures: string[] = [];
function check(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

const filenamePattern = /^[a-z0-9]+(-[a-z0-9]+)*\.webp$/;

const seenIds = new Set<string>();
for (const entry of heroImages) {
  const label = entry.id || "(missing id)";
  check(typeof entry.id === "string" && entry.id.length > 0, "entry is missing an id");
  check(!seenIds.has(entry.id), "duplicate hero image id: " + label);
  seenIds.add(entry.id);
  check(
    typeof entry.src === "string" && entry.src.startsWith(HERO_IMAGE_LIBRARY_PUBLIC_PATH),
    label + ": src must start with " + HERO_IMAGE_LIBRARY_PUBLIC_PATH + " — got " + String(entry.src),
  );
  const filename = entry.src.slice(HERO_IMAGE_LIBRARY_PUBLIC_PATH.length);
  check(filenamePattern.test(filename), label + ": filename must be lowercase hyphen-separated WebP — got " + filename);
  check(filename.replace(/\.webp$/, "") === entry.id, label + ": id must match the filename stem — got " + filename);
  const absolute = path.join(process.cwd(), "public", entry.src.replace(/^\//, ""));
  check(existsSync(absolute), label + ": hero image file missing on disk: " + entry.src);
  if (entry.focalPoint) {
    const { x, y } = entry.focalPoint;
    check(
      typeof x === "number" && typeof y === "number" && x >= 0 && x <= 100 && y >= 0 && y <= 100,
      label + ": focalPoint values must be 0-100 percentages",
    );
  }
  if (entry.fit) {
    check(entry.fit === "contain" || entry.fit === "cover", label + ": fit must be "contain" or "cover" — got " + entry.fit);
  }
  check(typeof entry.alt === "string" && entry.alt.trim().length > 0, label + ": descriptive alt text is required");
}

// The hero must always have slides: library entries take precedence, and the
// legacy Drive fallback covers the unpopulated-library state.
const slides = getActiveHeroSlides();
check(slides.length > 0, "hero has no active slides — neither the library nor the Drive fallback is active");
check(
  isHeroLibraryConfigured() || slides.every((slide) => slide.src.includes("lh3.googleusercontent.com")),
  "library not configured, so every active slide must come from the Drive fallback",
);
check(
  heroConfig.durationMs >= (heroConfig.cubeTransitionMs || 900) + 1000,
  "autoplay dwell (durationMs) must comfortably exceed the cube transition duration",
);

if (failures.length > 0) {
  console.error("hero:contract-test FAILED:");
  for (const failure of failures) console.error("  - " + failure);
  process.exit(1);
}
console.log("hero:contract-test passed (" + heroImages.length + " library entries, " + slides.length + " active slides).");
