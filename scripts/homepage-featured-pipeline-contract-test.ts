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
//
// Provider taxonomy (see scripts/cms-reconcile.ts, editorial-migration.ts,
// and the studio API route):
//   "notion"      — Notion editorial pipeline (content-server direct read)
//   "radarsite"   — Studio panel publications (studio route defaultArticle)
//   "radarcharts" — WordPress reconcile IMPORT from radarcharts.net/wp-json
//                   (legacy CMS content — must NEVER feature on the homepage)
//   "legacy"      — remradar.wordpress.com import (legacy CMS)

function record(overrides: Record<string, unknown>): CmsRecord {
  return { slug: "sample", title: "Sample article", status: "published", ...overrides } as CmsRecord;
}

const legacyImport = record({ slug: "legacy-wordpress-import", sourceProvider: "legacy", sourceUrl: "https://radarcharts.net/legacy", publishedAt: "2026-01-02T00:00:00.000Z", featured: true });
const unmarkedImport = record({ slug: "unmarked-snapshot-import", publishedAt: "2026-01-03T00:00:00.000Z", featured: true });
const notionArticle = record({ slug: "notion-new-original", sourceProvider: "notion", publishedAt: "2026-10-01T00:00:00.000Z" });
const notionFeatured = record({ slug: "notion-featured-original", sourceProvider: "notion", publishedAt: "2026-09-01T00:00:00.000Z", featured: true });
const studioArticle = record({ slug: "studio-published-original", sourceProvider: "radarsite", publishedAt: "2026-10-05T00:00:00.000Z" });
const wordpressImport = record({ slug: "wordpress-reconcile-import", sourceProvider: "radarcharts", sourceUrl: "https://radarcharts.net/2026/10/gande-insta-babe", publishedAt: "2026-10-06T00:00:00.000Z", featured: true });

assert.equal(isOriginalEditorialRecord(notionArticle), true, "Notion records are new originals");
assert.equal(isOriginalEditorialRecord(studioArticle), true, "Studio (radarsite) records are new originals");
assert.equal(isOriginalEditorialRecord(wordpressImport), false, "WordPress reconcile imports (provider radarcharts) are NOT new originals and must never feature on the homepage");
assert.equal(isOriginalEditorialRecord(legacyImport), false, "legacy-provider records are not new originals");
assert.equal(isOriginalEditorialRecord(unmarkedImport), false, "records without a provider are not new originals");

// Generic editorial selection still includes legacy records (archives unchanged).
const genericSelection = selectEditorialTreeRecords([legacyImport, unmarkedImport, notionArticle, studioArticle, wordpressImport], 10);
assert.ok(genericSelection.some((item) => item.slug === "wordpress-reconcile-import"), "generic editorial selection keeps WordPress imports for the archives");

// Homepage featured pipeline excludes every legacy/imported record.
const pipeline = selectFeaturedPipelineRecords([legacyImport, unmarkedImport, notionArticle, notionFeatured, studioArticle, wordpressImport], 10);
assert.equal(pipeline.length, 3, "pipeline returns only the new-original records");
assert.ok(pipeline.every((item) => isOriginalEditorialRecord(item)), "pipeline never returns an imported record");
assert.equal(pipeline[0].slug, "notion-featured-original", "featured originals pin first");
assert.ok(pipeline.slice(1).every((item, index) => index === 0 || String(pipeline[index].publishedAt) >= String(item.publishedAt)), "remaining originals are newest-first");

// Limit is respected after the legacy filter.
const limited = selectFeaturedPipelineRecords([legacyImport, wordpressImport, notionArticle, studioArticle], 1);
assert.equal(limited.length, 1, "limit applies to the filtered set");
assert.equal(limited[0].slug, "studio-published-original", "newest original wins the single slot");

// An imports-only catalogue produces an empty homepage tree (renders nothing
// rather than surfacing legacy imports on the homepage).
assert.equal(selectFeaturedPipelineRecords([legacyImport, unmarkedImport, wordpressImport], 4).length, 0, "legacy-only content never features");

console.log("Homepage featured pipeline contract passed: Notion + Studio originals featured, WordPress/legacy imports excluded, featured-first ordering preserved.");
