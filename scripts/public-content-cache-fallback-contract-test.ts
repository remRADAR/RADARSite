import assert from "node:assert/strict";
import { createPublicContentCacheReader } from "@/lib/content-server";

// Regression guard for the production rendering incident on Cloudflare/Vinext.
//
// readPublicContent() previously wrapped the public read in a module-level
// unstable_cache call and only fell back to the durable store when the thrown
// error message matched /incrementalCache|unstable_cache/i. In the Vinext
// Worker runtime the cache adapter can fail with different wording (or be
// missing entirely), which escaped the guard and crashed every route that
// reads published content into the error boundary.
//
// The cache is now created lazily behind createPublicContentCacheReader, and
// readPublicContent falls back to the durable read on ANY cache-path failure.

// The cache adapter factory throwing (any message) must degrade to null,
// never propagate.
for (const message of [
  "Cannot read properties of undefined (reading 'get')",
  "readCachedPublicContent is not a function",
  "Route used unstable_cache without an incrementalCache",
  "Something entirely different",
]) {
  const reader = createPublicContentCacheReader(() => {
    throw new Error(message);
  });
  assert.equal(reader, null, `a throwing cache adapter must degrade to null (${message})`);
}

// A missing/undefined adapter export must degrade to null.
assert.equal(createPublicContentCacheReader(() => undefined), null, "a missing cache adapter must degrade to null");
assert.equal(createPublicContentCacheReader(() => null), null, "a null cache adapter must degrade to null");

// A healthy adapter passes through untouched.
const healthy = async () => "cached-payload";
assert.equal(createPublicContentCacheReader(() => healthy), healthy, "a healthy cache adapter must be preserved");

// The snapshot-only build path must keep serving published snapshot content
// without touching any cache or database.
process.env.RADAR_SKIP_DATABASE = "1";
const { getMergedContentSnapshot, readPublishedContent } = await import("@/lib/content-server");

const published = await readPublishedContent();
const snapshot = getMergedContentSnapshot();
assert.ok(Array.isArray(published.articles), "readPublishedContent must return articles");
assert.ok(published.articles.length > 0, "published snapshot content must not be empty");
assert.ok(
  published.articles.every((article: { status?: string }) => article.status !== "draft" && article.status !== "archived"),
  "readPublishedContent must filter draft and archived records",
);
assert.equal(published.articles.length, (snapshot.articles as { status?: string }[]).filter((a) => a.status !== "draft" && a.status !== "archived").length);

console.log(JSON.stringify({ cacheAdapterDegradation: "PASS", snapshotFallback: "PASS", publishedFiltering: "PASS" }, null, 2));
