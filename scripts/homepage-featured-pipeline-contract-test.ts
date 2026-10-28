import assert from "node:assert/strict";
import type { CmsRecord } from "@/lib/content-server";
import { isOriginalEditorialRecord } from "@/lib/editorial-archives";
import { selectEditorialTreeRecords, selectFeaturedPipelineRecords } from "@/lib/editorial-tree";

// Homepage contract:
// 1. Current RADARCharts CMS, Notion, and Studio publications are eligible.
// 2. The older WordPress.com archive and unmarked snapshot records stay archive-only.
// 3. Featured records pin first; remaining current records sort newest-first.

function record(overrides: Record<string, unknown>): CmsRecord {
  return { slug: "sample", title: "Sample article", status: "published", ...overrides } as CmsRecord;
}

const legacyImport = record({ slug: "legacy-wordpress-import", sourceProvider: "legacy", sourceUrl: "https://remradar.wordpress.com/legacy", publishedAt: "2025-12-23T00:00:00.000Z", featured: true });
const unmarkedImport = record({ slug: "unmarked-snapshot-import", publishedAt: "2026-01-03T00:00:00.000Z", featured: true });
const notionArticle = record({ slug: "notion-new-original", sourceProvider: "notion", publishedAt: "2026-10-01T00:00:00.000Z" });
const notionFeatured = record({ slug: "notion-featured-original", sourceProvider: "notion", publishedAt: "2026-09-01T00:00:00.000Z", featured: true });
const studioArticle = record({ slug: "studio-published-original", sourceProvider: "radarsite", publishedAt: "2026-10-05T00:00:00.000Z" });
const currentCmsArticle = record({ slug: "current-radarcharts-cms-article", sourceProvider: "radarcharts", sourceUrl: "https://radarcharts.net/2026/10/current-story", publishedAt: "2026-10-06T00:00:00.000Z" });

assert.equal(isOriginalEditorialRecord(notionArticle), true, "Notion records are homepage-eligible");
assert.equal(isOriginalEditorialRecord(studioArticle), true, "Studio (radarsite) records are homepage-eligible");
assert.equal(isOriginalEditorialRecord(currentCmsArticle), true, "current radarcharts.net CMS records are homepage-eligible");
assert.equal(isOriginalEditorialRecord(legacyImport), false, "legacy-provider records remain archive-only");
assert.equal(isOriginalEditorialRecord(unmarkedImport), false, "records without a provider are not verified as current");

// Generic editorial selection still includes current and legacy records.
const genericSelection = selectEditorialTreeRecords([legacyImport, unmarkedImport, notionArticle, studioArticle, currentCmsArticle], 10);
assert.ok(genericSelection.some((item) => item.slug === "legacy-wordpress-import"), "generic editorial selection keeps legacy records for archives");
assert.ok(genericSelection.some((item) => item.slug === "current-radarcharts-cms-article"), "generic editorial selection keeps current CMS records");

const pipeline = selectFeaturedPipelineRecords([legacyImport, unmarkedImport, notionArticle, notionFeatured, studioArticle, currentCmsArticle], 10);
assert.equal(pipeline.length, 4, "pipeline returns current CMS, Notion, and Studio records only");
assert.ok(pipeline.every((item) => isOriginalEditorialRecord(item)), "pipeline never returns legacy or unmarked imports");
assert.equal(pipeline[0].slug, "notion-featured-original", "featured current records pin first");
assert.equal(pipeline[1].slug, "current-radarcharts-cms-article", "newest unfeatured current CMS article follows featured records");
assert.ok(pipeline.slice(2).every((item, index) => index === 0 || String(pipeline[index + 1].publishedAt) >= String(item.publishedAt)), "remaining current records are newest-first");

const limited = selectFeaturedPipelineRecords([legacyImport, currentCmsArticle, notionArticle, studioArticle], 1);
assert.equal(limited.length, 1, "limit applies to the current editorial set");
assert.equal(limited[0].slug, "current-radarcharts-cms-article", "newest current CMS article wins the single slot");

assert.equal(selectFeaturedPipelineRecords([legacyImport, unmarkedImport], 4).length, 0, "legacy-only content never features");

console.log("Homepage featured pipeline contract passed: current RADARCharts CMS + Notion + Studio eligible; legacy and unmarked records excluded.");
