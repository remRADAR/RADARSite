import { resolveCurrentMediaUrl, type CurrentMediaMap } from "@/lib/current-media-map";

export type EffectiveImageReason = "not-eligible" | "source-passthrough" | "photon-stripped" | "http-upgraded" | "current-map-resolved";

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
 * Recovered current-CMS assets resolve through the reversible R2 map first.
 * If an asset is still unmapped, legacy Photon and HTTP normalization remains
 * available as a source fallback while the original files are recovered.
 */
export function getEffectiveImageUrl(source: string | URL | null | undefined, mapping?: CurrentMediaMap): EffectiveImageUrl {
  const originalUrl = typeof source === "string" ? source : source?.toString() || "";
  if (!originalUrl) return { originalUrl, effectiveUrl: originalUrl, fallbackApplied: false, reason: "not-eligible" };

  // Local static paths pass through unchanged.
  if (originalUrl.startsWith("/")) {
    return { originalUrl, effectiveUrl: originalUrl, fallbackApplied: false, reason: "source-passthrough" };
  }

  const recoveredUrl = resolveCurrentMediaUrl(originalUrl, mapping);
  if (recoveredUrl) return { originalUrl, effectiveUrl: recoveredUrl, fallbackApplied: true, reason: "current-map-resolved" };

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
