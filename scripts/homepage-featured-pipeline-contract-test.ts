import assert from "node:assert/strict";
import type { CmsRecord } from "@/lib/content-server";
import { isOriginalEditorialRecord } from "@/lib/editorial-archives";
import { selectEditorialTreeRecords, selectFeaturedPipelineRecords } from "@/lib/editorial-tree";

// Homepage featured pipeline contract:
// 1. The homepage features ONLY new-original articles (Notion imports and
//    Studio-panel publications). Legacy WordPress/CMS imports never feature.
// 2. Featured originals pin first, then most recent.
// 3. Legacy records still flow through the generic editorial selection
//    (archive behaviour is unchanged) — only the homepage pipeline filters.

function record(overrides: Record<string, unknown>): CmsRecord {
  return { slug: "sample", title: "Sample article", status: "published", ...overrides } as CmsRecord;
}

const legacyImport = record({ slug: "legacy-wordpress-import", sourceProvider: "legacy", sourceUrl: "https://radarcharts.net/legacy", publishedAt: "2026-01-02T00:00:00.000Z", featured: true });
const unmarkedImport = record({ slug: "unmarked-snapshot-import", publishedAt: "2026-01-03T00:00:00.000Z", featured: true });
const notionArticle = record({ slug: "notion-new-original", sourceProvider: "notion", publishedAt: "2026-10-01T00:00:00.000Z" });
const notionFeatured = record({ slug: "notion-featured-original", sourceProvider: "notion", publishedAt: "2026-09-01T00:00:00.000Z", featured: true });
const studioArticle = record({ slug: "studio-published-original", sourceProvider: "radarsite", publishedAt: "2026-10-05T00:00:00.000Z" });

assert.equal(isOriginalEditorialRecord(notionArticle), true, "Notion records are new originals");
assert.equal(isOriginalEditorialRecord(studioArticle), true, "Studio (radarsite) records are new originals");
assert.equal(isOriginalEditorialRecord(legacyImport), false, "legacy-provider records are not new originals");
assert.equal(isOriginalEditorialRecord(unmarkedImport), false, "records without a provider are not new originals");

// Generic editorial selection still includes legacy records (archives unchanged).
const genericSelection = selectEditorialTreeRecords([legacyImport, unmarkedImport, notionArticle, studioArticle], 10);
assert.ok(genericSelection.some((item) => item.slug === "legacy-wordpress-import"), "generic editorial selection keeps legacy records");

// Homepage featured pipeline excludes every legacy record.
const pipeline = selectFeaturedPipelineRecords([legacyImport, unmarkedImport, notionArticle, notionFeatured, studioArticle], 10);
assert.equal(pipeline.length, 3, "pipeline returns only the new-original records");
assert.ok(pipeline.every((item) => isOriginalEditorialRecord(item)), "pipeline never returns a legacy record");
assert.equal(pipeline[0].slug, "notion-featured-original", "featured originals pin first");
assert.ok(pipeline.slice(1).every((item, index, rest) => {
  void rest;
  return index === 0 || String(pipeline[index].publishedAt) >= String(item.publishedAt);
}), "remaining originals are newest-first");

// Limit is respected after the legacy filter.
const limited = selectFeaturedPipelineRecords([legacyImport, notionArticle, studioArticle], 1);
assert.equal(limited.length, 1, "limit applies to the filtered set");
assert.equal(limited[0].slug, "studio-published-original", "newest original wins the single slot");

// A legacy-only catalogue produces an empty homepage tree (renders nothing
// rather than surfacing legacy imports on the homepage).
assert.equal(selectFeaturedPipelineRecords([legacyImport, unmarkedImport], 4).length, 0, "legacy-only content never features");

console.log("Homepage featured pipeline contract passed: legacy imports excluded, Notion + Studio originals featured, featured-first ordering preserved.");
