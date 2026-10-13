export type EffectiveImageReason = "not-eligible" | "source-passthrough";

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
 * The previous Jetpack/Photon rewrite (i0.wp.com/radarcharts.net/...) was removed:
 * the self-hosted WordPress origin behind radarcharts.net is retired, so Photon
 * can no longer fetch these uploads and every rewritten URL failed. Eligible
 * upload URLs are passed through unchanged; ResilientImage degrades to a branded
 * placeholder when the origin cannot deliver, and the current-media R2 migration
 * rewrites stored URLs directly once uploads resume.
 */
export function getEffectiveImageUrl(source: string | URL | null | undefined): EffectiveImageUrl {
  const originalUrl = typeof source === "string" ? source : source?.toString() || "";
  if (!originalUrl) return { originalUrl, effectiveUrl: originalUrl, fallbackApplied: false, reason: "not-eligible" };

  try {
    const parsed = source instanceof URL ? new URL(source.toString()) : new URL(originalUrl);
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
