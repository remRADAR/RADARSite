import assert from "node:assert/strict";
import { getEffectiveImageUrl } from "../src/lib/effective-image-url.ts";

const eligible = [
  ["https://radarcharts.net/wp-content/uploads/2026/09/example.jpeg", "https://i0.wp.com/radarcharts.net/wp-content/uploads/2026/09/example.jpeg"],
  ["https://radarcharts.net/wp-content/uploads/2026/09/nested/path/example.webp", "https://i0.wp.com/radarcharts.net/wp-content/uploads/2026/09/nested/path/example.webp"],
  ["https://radarcharts.net/wp-content/uploads/2026/09/example.jpeg?fit=1200&crop=faces", "https://i0.wp.com/radarcharts.net/wp-content/uploads/2026/09/example.jpeg?fit=1200&crop=faces"],
  ["https://radarcharts.net/wp-content/uploads/2026/09/example.png", "https://i0.wp.com/radarcharts.net/wp-content/uploads/2026/09/example.png"],
];
for (const [source, expected] of eligible) {
  const result = getEffectiveImageUrl(source);
  assert.equal(result.originalUrl, source);
  assert.equal(result.effectiveUrl, expected);
  assert.equal(result.fallbackApplied, true);
  assert.equal(result.reason, "jetpack-fallback");
}

const unchanged = [
  "http://radarcharts.net/wp-content/uploads/2026/09/example.jpeg",
  "https://www.radarcharts.net/wp-content/uploads/2026/09/example.jpeg",
  "https://radarcharts.net/other-path/example.jpeg",
  "https://remradar.wordpress.com/wp-content/uploads/2025/12/example.jpg",
  "https://images.unsplash.com/photo-example.jpg",
  "https://user:password@radarcharts.net/wp-content/uploads/2026/09/example.jpeg",
  "https://radarcharts.net/wp-content/uploads/2026/09/example.jpeg#fragment",
  "not a URL",
];
for (const source of unchanged) {
  const result = getEffectiveImageUrl(source);
  assert.equal(result.originalUrl, source);
  assert.equal(result.effectiveUrl, source);
  assert.equal(result.fallbackApplied, false);
  assert.equal(result.reason, "not-eligible");
}

console.log(`effective-image-url: ${eligible.length + unchanged.length} assertions passed`);
