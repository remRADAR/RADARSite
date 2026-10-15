import { readPublishedContent, type CmsRecord } from "@/lib/content-server";
import { normalizeEditorialRecord, articlePath } from "@/lib/editorial-normalization";

/**
 * Editorial Tree — the homepage's living editorial feed.
 *
 * The "tree" metaphor: every new published article is a new branch. The tree
 * always shows the freshest growth (most recent posts first) and sheds the
 * oldest when the canopy is full. Nothing is hardcoded — the CMS is the
 * single source of truth, so publishing a new post instantly updates the
 * homepage on the next revalidation.
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

/**
 * Resolve an editorial image URL to a directly loadable form.
 *
 * Handles:
 * - Jetpack/Photon rewrites (i0.wp.com/radarcharts.net/...) → stripped to the
 *   origin URL so the browser fetches the asset directly instead of through
 *   the retired Photon proxy.
 * - Local /editorial/... paths → passed through for Next.js static serving.
 * - R2 CDN URLs → passed through unchanged.
 * - HTTP radarcharts.net → upgraded to HTTPS.
 * - Relative or malformed values → returned as-is (ResilientImage handles failure).
 */
export function resolveEditorialImageUrl(source: string | null | undefined): string {
  if (!source) return "";
  const trimmed = typeof source === "string" ? source.trim() : "";
  if (!trimmed) return "";

  // Local static path — serve directly from /public.
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const parsed = new URL(trimmed);

    // Strip Jetpack/Photon proxy prefix:
    //   https://i0.wp.com/radarcharts.net/wp-content/uploads/...  →  https://radarcharts.net/wp-content/uploads/...
    if (
      (parsed.hostname === "i0.wp.com" || parsed.hostname.endsWith(".wp.com")) &&
      parsed.pathname.startsWith("/radarcharts.net/")
    ) {
      const directPath = parsed.pathname.replace(/^\/radarcharts\.net/, "");
      return "https://radarcharts.net" + directPath + parsed.search;
    }

    // Upgrade HTTP → HTTPS for the primary domain.
    if (parsed.protocol === "http:" && (parsed.hostname === "radarcharts.net" || parsed.hostname === "www.radarcharts.net")) {
      parsed.protocol = "https:";
      return parsed.toString();
    }

    // R2 CDN, Unsplash, Google Drive, and other valid HTTPS URLs pass through.
    return trimmed;
  } catch {
    // Not a valid absolute URL — return as-is (may be a relative path ResilientImage can handle).
    return trimmed;
  }
}

/**
 * Extract the best available image URL from an editorial record.
 * Priority: explicit featured image → imageUrl → first inline img in body HTML.
 */
export function pickEditorialImage(record: CmsRecord): string {
  const explicit =
    (typeof record.featuredImage === "string" && record.featuredImage.trim()) ||
    (typeof record.imageUrl === "string" && record.imageUrl.trim()) ||
    (typeof record.socialImage === "string" && record.socialImage.trim()) ||
    "";

  if (explicit) return resolveEditorialImageUrl(explicit);

  // Fall back to the first inline image in the body HTML.
  const bodySource = (typeof record.bodyHtml === "string" && record.bodyHtml) ||
    (typeof record.body === "string" && record.body) || "";
  const inlineMatch = bodySource.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  if (inlineMatch && inlineMatch[1]) return resolveEditorialImageUrl(inlineMatch[1]);

  return "";
}

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

/**
 * Build responsive srcset entries for an editorial image URL.
 * Returns undefined when the URL is empty or not suitable for srcset generation.
 */
export function buildEditorialSrcSet(imageUrl: string): string | undefined {
  if (!imageUrl) return undefined;

  // Local paths and data URIs are served as-is — no srcset needed.
  if (imageUrl.startsWith("/") || imageUrl.startsWith("data:")) return undefined;

  try {
    const parsed = new URL(imageUrl);
    // Only generate srcset for WordPress upload URLs (which support ?w= sizing).
    const isWordPress = parsed.hostname === "radarcharts.net" || parsed.hostname === "www.radarcharts.net";

    if (isWordPress) {
      const basePath = parsed.pathname;
      const widths = [640, 750, 828, 1080, 1200, 1920, 2048];
      return widths
        .map((w) => {
          const sep = basePath.includes("?") ? "&" : "?";
          return parsed.origin + basePath + sep + "w=" + w + " " + w + "w";
        })
        .join(", ");
    }

    return undefined;
  } catch {
    return undefined;
  }
}
