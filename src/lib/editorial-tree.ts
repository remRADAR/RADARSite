import { readPublishedContent, type CmsRecord } from "@/lib/content-server";
import { normalizeEditorialRecord, articlePath } from "@/lib/editorial-normalization";
import { pickEditorialImage } from "@/lib/editorial-image";

/**
 * Editorial Tree — the homepage's living editorial feed (server-only).
 *
 * The "tree" metaphor: every new published article is a new branch. The tree
 * always shows the freshest growth (most recent posts first) and sheds the
 * oldest when the canopy is full. Nothing is hardcoded — the CMS is the
 * single source of truth, so publishing a new post instantly updates the
 * homepage on the next revalidation.
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

/**
 * Fetch the most recent published editorial posts from the CMS.
 * This is the "tree" — it grows automatically as new articles are published.
 *
 * @param limit Maximum number of posts to return (default 5).
 */
export async function getRecentEditorialPosts(limit = 5): Promise<EditorialTreePost[]> {
  const { articles } = await readPublishedContent();

  const normalized = articles
    .map((article) => normalizeEditorialRecord(article as CmsRecord))
    .sort((a, b) => {
      // Newest first — the tree grows upward.
      const dateA = String(a.publishedAt || a.date || "");
      const dateB = String(b.publishedAt || b.date || "");
      return dateB.localeCompare(dateA);
    })
    .slice(0, limit);

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
      author: record.author || "RADARCharts",
      imageUrl,
      imageAlt: record.featuredImageAlt || record.title || "Featured image",
      destinationUrl: articlePath(record),
      tone: TONE_CYCLE[index % TONE_CYCLE.length],
    };
  });
}
