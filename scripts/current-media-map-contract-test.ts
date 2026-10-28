import assert from "node:assert/strict";
import { normalizeCurrentMediaUrl, resolveCurrentMediaUrl } from "@/lib/current-media-map";
import { getEffectiveImageUrl } from "@/lib/effective-image-url";

const original = "https://radarcharts.net/wp-content/uploads/2026/09/story.jpeg";
assert.equal(normalizeCurrentMediaUrl("http://www.radarcharts.net/wp-content/uploads/2026/09/story.jpeg?w=640#crop"), original);
assert.equal(normalizeCurrentMediaUrl("https://i0.wp.com/radarcharts.net/wp-content/uploads/2026/09/story.jpeg?resize=640%2C480"), original);
assert.equal(resolveCurrentMediaUrl("http://radarcharts.net/wp-content/uploads/2026/09/story.jpeg?w=750", { [original]: "https://media.example/current/webp/story.webp" }), "https://media.example/current/webp/story.webp");
assert.deepEqual(
  getEffectiveImageUrl("http://www.radarcharts.net/wp-content/uploads/2026/09/story.jpeg?w=640", { [original]: "https://media.example/current/webp/story.webp" }),
  { originalUrl: "http://www.radarcharts.net/wp-content/uploads/2026/09/story.jpeg?w=640", effectiveUrl: "https://media.example/current/webp/story.webp", fallbackApplied: true, reason: "current-map-resolved" },
  "sanitized inline article images use the verified R2 delivery URL",
);
assert.equal(resolveCurrentMediaUrl("https://radarcharts.net/wp-content/uploads/2026/09/missing.jpeg"), "", "unmapped sources remain unchanged for the caller to handle");

console.log("Current media map contract passed: canonical URLs resolve reversibly and unknown URLs remain unmapped.");
