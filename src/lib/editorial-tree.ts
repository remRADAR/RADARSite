import { unstable_cache } from "next/cache";
import {
  PUBLIC_CONTENT_CACHE_TAG,
  PUBLIC_CONTENT_REVALIDATE_SECONDS,
  readPublishedContent,
  type CmsRecord,
} from "@/lib/content-server";
import { normalizeEditorialRecord, articlePath } from "@/lib/editorial-normalization";
import { pickEditorialImage } from "@/lib/editorial-image";
import { isOriginalEditorialRecord } from "@/lib/editorial-archives";
import { editorialAuthorProfile } from "@/lib/editorial-authors";

/**
 * Editorial Tree — the homepage's living editorial feed (server-only).
 *
 * The "tree" metaphor: every new published article is a new branch. The tree
 * puts explicitly Featured stories first, then shows the freshest growth
 * (most recent posts first) and sheds the oldest when the canopy is full.
 * Nothing is hardcoded — the CMS is the single source of truth, so publishing
 * a new post instantly updates the homepage on the next revalidation.
 *
 * Pure image utilities (resolveEditorialImageUrl, buildEditorialSrcSet) live
 * in @/lib/editorial-image so client components can import them safely.
 */

export type EditorialTreePost = {
  slug: string;
  title: string;
  excerpt: string;
  sectionLabel: string;
  section: string;
  publishedAt: string;
  date: string;
  year: string;
  author: string;
  /** Resolved, device-ready image URL (Photon stripped, local paths preserved). */
  imageUrl: string;
  imageAlt: string;
  destinationUrl: string;
  /** Tone for the generative fallback gradient when no image resolves. */
  tone: "warm" | "cool" | "mono" | "flare";
};

const TONE_CYCLE: Array<"warm" | "cool" | "mono" | "flare"> = ["flare", "warm", "cool", "mono"];

function isFeaturedRecord(record: CmsRecord): boolean {
  const value = record.featured;
  return value === true || value === 1 || (typeof value === "string" && /^(?:__yes__|true|yes|1)$/i.test(value.trim()));
}

export function selectEditorialTreeRecords(articles: CmsRecord[], limit = 4) {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 4;
  return articles
    .filter((article) => article.status !== "draft" && article.status !== "archived")
    .map((article) => normalizeEditorialRecord(article))
    .sort((a, b) => {
      const featuredOrder = Number(isFeaturedRecord(b)) - Number(isFeaturedRecord(a));
      if (featuredOrder) return featuredOrder;
      const dateA = String(a.publishedAt || a.date || "");
      const dateB = String(b.publishedAt || b.date || "");
      return dateB.localeCompare(dateA);
    })
    .slice(0, safeLimit);
}

/**
 * Homepage featured pipeline: only NEW ORIGINAL articles — Notion pipeline
 * imports and Studio-panel publications stored in the /ontheradar/articles
 * archive. Legacy WordPress/CMS imports are excluded from the homepage: they
 * remain reachable in the archives, but they never feature here.
 */
export function selectFeaturedPipelineRecords(articles: CmsRecord[], limit = 4) {
  return selectEditorialTreeRecords(articles.filter(isOriginalEditorialRecord), limit);
}

/**
 * Fetch the most recent published editorial posts for the homepage.
 * This is the "tree" — it grows automatically as new articles are published
 * through Notion or the Studio panel.
 *
 * @param limit Maximum number of posts to return (default 4).
 */
async function buildRecentEditorialPosts(limit: number): Promise<EditorialTreePost[]> {
  const { articles } = await readPublishedContent();
  const normalized = selectFeaturedPipelineRecords(articles as CmsRecord[], limit);

  return normalized.map((record, index) => {
    const imageUrl = pickEditorialImage(record);
    const rawDate = record.publishedAt || record.date || "";
    const year = rawDate.slice(0, 4) || new Date().getFullYear().toString();

    return {
      slug: record.slug,
      title: record.title || "Untitled editorial",
      excerpt: record.excerpt || "",
      sectionLabel: record.sectionLabel,
      section: record.section,
      publishedAt: record.publishedAt || "",
      date: record.date || "",
      year,
      author: editorialAuthorProfile(record).byline,
      imageUrl,
      imageAlt: record.featuredImageAlt || record.title || "Featured image",
      destinationUrl: articlePath(record),
      tone: TONE_CYCLE[index % TONE_CYCLE.length],
    };
  });
}

/**
 * Cached homepage editorial feed.
 *
 * The homepage used to be `force-dynamic`, so every request re-read the public
 * content and re-normalised the full article collection (342 records) before
 * selecting four posts. On a Cloudflare Worker with a hard CPU budget that
 * pushed the request over the limit and produced intermittent 503s
 * (error 1102). The selection is now memoised in the shared tagged content
 * cache, so a request only pays for the four-record projection. Publishing
 * already invalidates PUBLIC_CONTENT_CACHE_TAG, which keeps the homepage
 * current without a rebuild.
 */
const cachedRecentEditorialPosts = new Map<number, () => Promise<EditorialTreePost[]>>();

function recentEditorialPostsCache(limit: number) {
  const existing = cachedRecentEditorialPosts.get(limit);
  if (existing) return existing;
  const cached = unstable_cache(
    () => buildRecentEditorialPosts(limit),
    ["radarsite-homepage-editorial-tree", String(limit)],
    { revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS, tags: [PUBLIC_CONTENT_CACHE_TAG] },
  );
  cachedRecentEditorialPosts.set(limit, cached);
  return cached;
}

export async function getRecentEditorialPosts(limit = 4): Promise<EditorialTreePost[]> {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 4;
  try {
    return await recentEditorialPostsCache(safeLimit)();
  } catch (error) {
    // The incremental cache is an optimisation, never a prerequisite: a
    // runtime that rejects it must still render the homepage.
    console.warn("[editorial-tree] Homepage editorial cache unavailable; reading directly", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return buildRecentEditorialPosts(safeLimit);
  }
}
