import assert from "node:assert/strict";
import type { CmsRecord } from "@/lib/content-server";
import { selectEditorialTreeRecords, selectFeaturedPipelineRecords } from "@/lib/editorial-tree";

const records: CmsRecord[] = [
  {
    id: "notion-spotlight",
    sourceProvider: "notion",
    slug: "notion-spotlight-featured",
    title: "A new artist Spotlight",
    excerpt: "A published Notion Spotlight story.",
    editorialType: "Spotlight",
    section: "discovery-spot",
    categories: ["Discovery Spot"],
    featured: true,
    status: "published",
    publishedAt: "2026-10-24T09:00:00.000Z",
    featuredImage: "/editorial/spotlight.webp",
  },
  {
    id: "notion-press",
    sourceProvider: "notion",
    slug: "notion-press-latest",
    title: "Latest Notion Press article",
    excerpt: "A published Press story.",
    editorialType: "Press",
    section: "radar-articles",
    categories: ["RADARArticles"],
    featured: false,
    status: "published",
    publishedAt: "2026-10-26T09:00:00.000Z",
  },
  {
    slug: "legacy-press",
    title: "Legacy article remains in the feed",
    excerpt: "The legacy archive remains available.",
    editorialType: "article",
    categories: ["RADARArticles"],
    status: "published",
    publishedAt: "2026-10-25T09:00:00.000Z",
  },
  {
    slug: "draft-spotlight",
    title: "Draft must not appear",
    editorialType: "Spotlight",
    featured: true,
    status: "draft",
    publishedAt: "2026-10-27T09:00:00.000Z",
  },
  {
    slug: "archived-press",
    title: "Archived content must not appear",
    editorialType: "Press",
    featured: true,
    status: "archived",
    publishedAt: "2026-10-28T09:00:00.000Z",
  },
];

// Generic editorial selection (archive behaviour): legacy imports remain.
const selected = selectEditorialTreeRecords(records, 4);
assert.deepEqual(selected.map((record) => record.slug), ["notion-spotlight-featured", "notion-press-latest", "legacy-press"]);
assert.equal(selected[0]?.sectionLabel, "Discovery Spot", "Notion Spotlight keeps its editorial placement on the homepage");
assert.equal(selectEditorialTreeRecords(records, 1)[0]?.slug, "notion-spotlight-featured", "explicitly featured Notion content is promoted first");

// Homepage featured pipeline: ONLY new-original records (Notion + Studio).
// The legacy import must never feature on the homepage.
const pipeline = selectFeaturedPipelineRecords(records, 4);
assert.deepEqual(pipeline.map((record) => record.slug), ["notion-spotlight-featured", "notion-press-latest"], "homepage featured pipeline excludes legacy imports");
assert.equal(selectFeaturedPipelineRecords(records, 1)[0]?.slug, "notion-spotlight-featured", "explicitly featured new originals are promoted first on the homepage");

console.log(JSON.stringify({ notionFeaturedFirst: true, recentNotionPublishedIncluded: true, editorialSectionRetained: true, draftsAndArchivedExcluded: true, legacyExcludedFromHomepage: true }, null, 2));
