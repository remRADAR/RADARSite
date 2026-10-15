export type EffectiveImageReason = "not-eligible" | "source-passthrough" | "photon-stripped" | "http-upgraded";

export type EffectiveImageUrl = {
  originalUrl: string;
  effectiveUrl: string;
  fallbackApplied: boolean;
  reason: EffectiveImageReason;
};

const SOURCE_HOSTS = new Set(["radarcharts.net", "www.radarcharts.net"]);
const UPLOADS_PREFIX = "/wp-content/uploads/";

/**
 * Derive the delivery URL for an imported CMS image without changing the stored
 * source value.
 *
 * Handles three transformations:
 * 1. Jetpack/Photon rewrites (i0.wp.com/radarcharts.net/...) are stripped to
 *    the origin URL — the self-hosted WordPress origin behind radarcharts.net
 *    is retired, so Photon can no longer fetch these uploads and every
 *    rewritten URL failed. Stripping the proxy prefix lets the browser fetch
 *    directly from radarcharts.net (which is still served by the CDN/host).
 * 2. HTTP radarcharts.net URLs are upgraded to HTTPS.
 * 3. All other URLs pass through unchanged; ResilientImage degrades to a
 *    branded placeholder when the origin cannot deliver.
 */
export function getEffectiveImageUrl(source: string | URL | null | undefined): EffectiveImageUrl {
  const originalUrl = typeof source === "string" ? source : source?.toString() || "";
  if (!originalUrl) return { originalUrl, effectiveUrl: originalUrl, fallbackApplied: false, reason: "not-eligible" };

  // Local static paths pass through unchanged.
  if (originalUrl.startsWith("/")) {
    return { originalUrl, effectiveUrl: originalUrl, fallbackApplied: false, reason: "source-passthrough" };
  }

  try {
    const parsed = source instanceof URL ? new URL(source.toString()) : new URL(originalUrl);

    // Strip Jetpack/Photon proxy prefix:
    //   https://i0.wp.com/radarcharts.net/wp-content/uploads/...  →  https://radarcharts.net/wp-content/uploads/...
    if (
      (parsed.hostname === "i0.wp.com" || parsed.hostname.endsWith(".wp.com")) &&
      parsed.pathname.startsWith("/radarcharts.net/")
    ) {
      const directPath = parsed.pathname.replace(/^\/radarcharts\.net/, "");
      const effectiveUrl = "https://radarcharts.net" + directPath + parsed.search;
      return { originalUrl, effectiveUrl, fallbackApplied: true, reason: "photon-stripped" };
    }

    // Upgrade HTTP → HTTPS for the primary domain.
    if (parsed.protocol === "http:" && SOURCE_HOSTS.has(parsed.hostname.toLowerCase())) {
      parsed.protocol = "https:";
      return { originalUrl, effectiveUrl: parsed.toString(), fallbackApplied: true, reason: "http-upgraded" };
    }

    const eligible =
      parsed.protocol === "https:" &&
      SOURCE_HOSTS.has(parsed.hostname.toLowerCase()) &&
      parsed.pathname.startsWith(UPLOADS_PREFIX) &&
      !parsed.username &&
      !parsed.password;

    return {
      originalUrl,
      effectiveUrl: originalUrl,
      fallbackApplied: false,
      reason: eligible ? "source-passthrough" : "not-eligible",
    };
  } catch {
    return { originalUrl, effectiveUrl: originalUrl, fallbackApplied: false, reason: "not-eligible" };
  }
}
