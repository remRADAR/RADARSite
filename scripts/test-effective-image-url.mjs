import assert from "node:assert/strict";
import { getEffectiveImageUrl } from "../src/lib/effective-image-url.ts";

// The retired WordPress origin means the Jetpack/Photon rewrite is gone:
// eligible upload URLs pass through unchanged so the canonical source value is
// what the browser requests (and what the R2 migration will eventually replace).
const eligible = [
  ["https://radarcharts.net/wp-content/uploads/2026/09/example.jpeg", "source-passthrough"],
  ["https://radarcharts.net/wp-content/uploads/2026/09/nested/path/example.webp", "source-passthrough"],
  ["https://radarcharts.net/wp-content/uploads/2026/09/example.jpeg?fit=1200&crop=faces", "source-passthrough"],
  ["https://www.radarcharts.net/wp-content/uploads/2026/09/example.png", "source-passthrough"],
];
for (const [source, reason] of eligible) {
  const result = getEffectiveImageUrl(source);
  assert.equal(result.originalUrl, source);
  assert.equal(result.effectiveUrl, source);
  assert.equal(result.fallbackApplied, false);
  assert.equal(result.reason, reason);
}

const unchanged = [
  "http://radarcharts.net/wp-content/uploads/2026/09/example.jpeg",
  "https://radarcharts.net/other-path/example.jpeg",
  "https://remradar.wordpress.com/wp-content/uploads/2025/12/example.jpg",
  "https://images.unsplash.com/photo-example.jpg",
  "https://pub-2d7f41f7140544c480801d8b90da765e.r2.dev/legacy/webp/example.webp",
  "/editorial/styling-is-choosing-life-with-aye-lawa-feat-wyza/featured.jpg",
  "https://user:password@radarcharts.net/wp-content/uploads/2026/09/example.jpeg",
  "not a URL",
  "",
];
for (const source of unchanged) {
  const result = getEffectiveImageUrl(source);
  assert.equal(result.originalUrl, source);
  assert.equal(result.effectiveUrl, source);
  assert.equal(result.fallbackApplied, false);
  assert.equal(result.reason, "not-eligible");
}

assert.equal(getEffectiveImageUrl(null).reason, "not-eligible");
assert.equal(getEffectiveImageUrl(undefined).effectiveUrl, "");

console.log(`effective-image-url: ${eligible.length + unchanged.length + 2} assertions passed`);
