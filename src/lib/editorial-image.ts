import type { CmsRecord } from "@/lib/content-server";
import { resolveCurrentMediaUrl } from "@/lib/current-media-map";

/**
 * Pure editorial image utilities — safe for both server and client bundles.
 * No server-only imports (no next/cache, no database).
 */

/**
 * Resolve an editorial image URL to a directly loadable form.
 *
 * Handles:
 * - Jetpack/Photon rewrites (i0.wp.com/radarcharts.net/...) → stripped to the
 *   direct source only when no verified R2 copy exists; the retired source may
 *   still fail until the original is recovered.
 * - Local /editorial/... paths → passed through for Next.js static serving.
 * - R2 CDN URLs → passed through unchanged.
 * - HTTP radarcharts.net → upgraded to HTTPS.
 * - Relative or malformed values → returned as-is (ResilientImage handles failure).
 */
export function resolveEditorialImageUrl(source: string | null | undefined): string {
  if (!source) return "";
  const trimmed = typeof source === "string" ? source.trim() : "";
  if (!trimmed) return "";

  // Prefer a verified R2 copy for retired current-CMS assets. The map is empty
  // until originals are recovered, so unmapped sources retain the normal path.
  const currentMediaUrl = resolveCurrentMediaUrl(trimmed);
  if (currentMediaUrl) return currentMediaUrl;

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
 * Priority: explicit featured image → imageUrl → socialImage → first inline img in body HTML.
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

/**
 * Build responsive srcset entries for an editorial image URL.
 * Returns undefined when the URL is empty or not suitable for srcset generation.
 *
 * Generates width descriptors for WordPress upload URLs (which support ?w= sizing)
 * so the browser picks the optimal resolution per device and viewport.
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
