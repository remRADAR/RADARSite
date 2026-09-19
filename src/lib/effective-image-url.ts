export type EffectiveImageReason = "not-eligible" | "jetpack-fallback";

export type EffectiveImageUrl = {
  originalUrl: string;
  effectiveUrl: string;
  fallbackApplied: boolean;
  reason: EffectiveImageReason;
};

const FALLBACK_HOST = "i0.wp.com";
const SOURCE_HOST = "radarcharts.net";
const UPLOADS_PREFIX = "/wp-content/uploads/";

/**
 * Derive a delivery URL without changing the CMS/source value.
 * Only the verified radarcharts.net upload path is eligible for Jetpack.
 */
export function getEffectiveImageUrl(source: string | URL | null | undefined): EffectiveImageUrl {
  const originalUrl = typeof source === "string" ? source : source?.toString() || "";
  if (!originalUrl) return { originalUrl, effectiveUrl: originalUrl, fallbackApplied: false, reason: "not-eligible" };

  try {
    const parsed = source instanceof URL ? new URL(source.toString()) : new URL(originalUrl);
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== SOURCE_HOST ||
      !parsed.pathname.startsWith(UPLOADS_PREFIX) ||
      parsed.username ||
      parsed.password ||
      parsed.hash
    ) {
      return { originalUrl, effectiveUrl: originalUrl, fallbackApplied: false, reason: "not-eligible" };
    }

    const effective = new URL(parsed.toString());
    effective.protocol = "https:";
    effective.hostname = FALLBACK_HOST;
    effective.port = "";
    effective.username = "";
    effective.password = "";
    effective.hash = "";
    effective.pathname = `/${SOURCE_HOST}${parsed.pathname}`;

    return { originalUrl, effectiveUrl: effective.toString(), fallbackApplied: true, reason: "jetpack-fallback" };
  } catch {
    return { originalUrl, effectiveUrl: originalUrl, fallbackApplied: false, reason: "not-eligible" };
  }
}
