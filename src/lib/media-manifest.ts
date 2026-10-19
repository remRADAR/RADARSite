// Structured media manifest for the RADARCharts Automated Editorial Publishing Network.
// Records each asset's role, filename, MIME type, dimensions, storage key, durable URL,
// alt text, upload state and intended article position. Pure validation: no uploads,
// no credentials, no side effects. Temporary or signed upload URLs are rejected as
// durable media URLs; storage credentials are never read here.

export type MediaRole = "featured" | "inline";
export type MediaUploadState = "pending" | "uploaded" | "failed";
export type InlinePosition = "after-introduction" | "between-sections" | "before-conclusion";

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"] as const;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export type MediaAsset = {
  id: string;
  role: MediaRole;
  filename: string;
  mimeType: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  storageKey: string;
  /** Durable public URL on the configured media origin. Signed URLs are rejected. */
  url: string;
  altText: string;
  uploadState: MediaUploadState;
  /** Required for inline assets; ignored for the featured image. */
  position?: InlinePosition;
  /** Placement hint tying an inline image to a named section (for between-sections). */
  afterSection?: string;
  checksum?: string;
};

export type MediaManifestValidation = {
  ok: boolean;
  errors: Array<{ asset?: string; message: string }>;
  warnings: Array<{ asset?: string; message: string }>;
  featured?: MediaAsset;
  inlineAssets: MediaAsset[];
};

const SIGNATURE_QUERY_HINTS = ["x-amz-signature", "x-amz-credential", "x-amz-expires", "sig", "signature", "token", "expires", "x-goog-signature", "awsaccesskeyid"];

function looksTemporary(url: string): boolean {
  try {
    const parsed = new URL(url);
    const queryKeys = [...parsed.searchParams.keys()].map((key) => key.toLowerCase());
    return queryKeys.some((key) => SIGNATURE_QUERY_HINTS.includes(key));
  } catch {
    return true;
  }
}

export function validateMediaAsset(asset: MediaAsset, options: { publicBaseUrl?: string }): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!asset.id) errors.push("asset id is required");
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(asset.mimeType as AllowedImageMimeType)) errors.push(`mimeType ${asset.mimeType || "(missing)"} is not an allowed image type (content type is validated, not file extension)`);
  if (asset.sizeBytes !== undefined && (asset.sizeBytes <= 0 || asset.sizeBytes > MAX_IMAGE_BYTES)) errors.push("image size must be between 1 byte and 8 MiB");
  if (!asset.storageKey || !asset.storageKey.trim()) errors.push("storage key is required");
  if (asset.uploadState === "uploaded") {
    try {
      const parsed = new URL(asset.url);
      if (parsed.protocol !== "https:") errors.push("durable url must be https");
      if (looksTemporary(asset.url)) errors.push("temporary or signed url cannot be a durable media url");
      if (options.publicBaseUrl) {
        const base = new URL(options.publicBaseUrl);
        if (parsed.hostname !== base.hostname) errors.push(`durable url host ${parsed.hostname} does not match the configured media origin ${base.hostname}`);
      }
    } catch {
      errors.push("durable url is not a valid absolute url");
    }
    if (!asset.altText || !asset.altText.trim()) errors.push("uploaded assets require descriptive alt text based on the actual image");
  } else {
    warnings.push(`uploadState is ${asset.uploadState}; asset is not publication-ready`);
  }
  if (asset.role === "inline") {
    if (!asset.position) errors.push("inline assets require an explicit position");
    if (asset.position === "between-sections" && !asset.afterSection) errors.push("between-sections placement requires a named section");
  }
  if (asset.width !== undefined && (!Number.isInteger(asset.width) || asset.width <= 0)) errors.push("width must be a positive integer when provided");
  if (asset.height !== undefined && (!Number.isInteger(asset.height) || asset.height <= 0)) errors.push("height must be a positive integer when provided");
  return { errors, warnings };
}

export function validateMediaManifest(assets: unknown, options: { publicBaseUrl?: string; requireFeatured?: boolean } = {}): MediaManifestValidation {
  const errors: MediaManifestValidation["errors"] = [];
  const warnings: MediaManifestValidation["warnings"] = [];
  if (!Array.isArray(assets)) return { ok: false, errors: [{ message: "media manifest must be an array of assets" }], warnings, inlineAssets: [] };
  const typed = assets as MediaAsset[];
  const featured = typed.filter((asset) => asset.role === "featured");
  const inline = typed.filter((asset) => asset.role !== "featured");
  if (featured.length > 1) errors.push({ message: "exactly one featured image is allowed" });
  const requireFeatured = options.requireFeatured !== false;
  if (requireFeatured && featured.length === 0) errors.push({ message: "one explicitly designated featured image is required" });
  const seenKeys = new Set<string>();
  for (const asset of typed) {
    if (asset.role !== "featured" && asset.role !== "inline") errors.push({ asset: asset.id, message: "role must be featured or inline" });
    const result = validateMediaAsset(asset, options);
    result.errors.forEach((message) => errors.push({ asset: asset.id, message }));
    result.warnings.forEach((message) => warnings.push({ asset: asset.id, message }));
    if (asset.storageKey) {
      if (seenKeys.has(asset.storageKey)) errors.push({ asset: asset.id, message: `duplicate storage key ${asset.storageKey}` });
      seenKeys.add(asset.storageKey);
    }
  }
  if (featured.length === 1 && featured[0].uploadState !== "uploaded") {
    errors.push({ asset: featured[0].id, message: "the featured image must be uploaded to durable storage before publication" });
  }
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    featured: featured.length === 1 ? featured[0] : undefined,
    inlineAssets: inline,
  };
}
