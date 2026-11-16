import assert from "node:assert/strict";

// Regression guard for the production rendering incident on Cloudflare/Vinext.
//
// readPublicContent() previously only fell back to the durable read when the
// thrown cache error message matched /incrementalCache|unstable_cache/i. The
// Vinext Worker runtime fails the Next incremental cache with different
// wording, which escaped the guard and crashed every route that reads
// published content into the error boundary ("SYSTEM PAUSE / SIGNAL
// INTERRUPTED").
//
// Contract: public content reads must resolve to real published content even
// when the runtime cache adapter is hostile, absent, or fails with any
// message. The cache is an optimization, never a prerequisite.

// Run outside production-build mode so the runtime cache path is exercised,
// and with no database or Cloudflare store configured so the durable fallback
// deterministically resolves to the committed merged snapshot.
delete process.env.RADAR_SKIP_DATABASE;
delete process.env.NEXT_PHASE;
delete process.env.DATABASE_URL;
delete process.env.RADAR_NOTION_DIRECT_READ_ENABLED;
delete process.env.NOTION_API_KEY;
delete process.env.RADAR_NOTION_DATA_SOURCE_ID;

const { readPublicContent, readPublishedContent, getMergedContentSnapshot } = await import("@/lib/content-server");

// The full public read must never throw, whatever the cache layer does.
const content = await readPublicContent();
const snapshot = getMergedContentSnapshot();
assert.ok(Array.isArray(content.articles), "readPublicContent must return articles");
assert.ok(content.articles.length > 0, "public content must not be empty when the cache layer fails");
assert.equal(content.articles.length, snapshot.articles.length, "with no durable store configured, public reads must serve the committed snapshot");

// The published view must filter draft and archived records.
const published = await readPublishedContent();
assert.ok(Array.isArray(published.articles) && published.articles.length > 0, "readPublishedContent must return published articles");
assert.ok(
  published.articles.every((article: { status?: string }) => article.status !== "draft" && article.status !== "archived"),
  "readPublishedContent must filter draft and archived records",
);
assert.equal(
  published.articles.length,
  (snapshot.articles as { status?: string }[]).filter((a) => a.status !== "draft" && a.status !== "archived").length,
  "published article count must match the committed snapshot's published records",
);

console.log(JSON.stringify({ publicReadNeverThrows: "PASS", snapshotFallback: "PASS", publishedFiltering: "PASS" }, null, 2));
