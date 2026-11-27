/**
 * Studio media upload pipeline.
 *
 * Flow: authenticated Studio API → magic-byte signature validation → optional
 * sharp inspection (decompression-bomb guard) → original bytes stored in
 * Cloudflare storage (never discarded) → WebP derivative for JPEG/PNG sources
 * (reusing the site's established `webp-q80-max2400-v1` conversion profile) →
 * asset registered in the media library manifest.
 *
 * sharp is loaded dynamically. In runtimes where it is unavailable (the
 * Cloudflare Worker), uploads still succeed: the magic-byte signature remains
 * the authoritative content check and the original file is delivered as-is,
 * mirroring the staging philosophy of the existing Notion media pipeline.
 *
 * Storage and registry access are injectable so contract tests can exercise
 * the full pipeline without network access or credentials.
 */

import { checksumSha256, deleteMediaObject, putMediaObject, mediaStorageDiagnostics, type StoredMedia } from "@/lib/media-storage";
import {
  buildMediaStorageKey,
  detectImageSignature,
  mediaLibraryAssetId,
  upsertMediaAsset,
  type MediaLibraryAsset,
} from "@/lib/media-library";

export const DEFAULT_MEDIA_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ABSOLUTE_MEDIA_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 100_000_000;
const MAX_DELIVERED_WIDTH = 2400;
export const MEDIA_CONVERSION_PROFILE = "webp-q80-max2400-v1";

/** Configurable upload limit: RADAR_MEDIA_MAX_UPLOAD_BYTES, clamped to [1 KiB, 25 MiB]. */
export function maxMediaUploadBytes() {
  const raw = Number(process.env.RADAR_MEDIA_MAX_UPLOAD_BYTES);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_MEDIA_MAX_UPLOAD_BYTES;
  return Math.min(Math.max(Math.floor(raw), 1024), ABSOLUTE_MEDIA_MAX_UPLOAD_BYTES);
}

export type MediaUploadErrorCode = "MEDIA_UPLOAD_EMPTY" | "MEDIA_UPLOAD_TOO_LARGE" | "MEDIA_FORMAT_UNSUPPORTED" | "MEDIA_MIME_MISMATCH" | "MEDIA_IMAGE_INVALID";

export class MediaUploadValidationError extends Error {
  readonly code: MediaUploadErrorCode;
  constructor(message: string, code: MediaUploadErrorCode) { super(message); this.name = "MediaUploadValidationError"; this.code = code; }
}

async function loadSharp() {
  try { return (await import("sharp")).default; }
  catch { return null; }
}

export type MediaObjectStore = (input: { key: string; body: Uint8Array | Buffer; contentType: string; metadata?: Record<string, string> }) => Promise<StoredMedia>;
export type MediaObjectRemover = (key: string) => Promise<void>;

async function defaultStore(input: { key: string; body: Uint8Array | Buffer; contentType: string; metadata?: Record<string, string> }): Promise<StoredMedia> {
  return putMediaObject({ ...input, cacheControl: "public, max-age=31536000, immutable" });
}

export type ProcessedStudioUpload = { asset: MediaLibraryAsset; conversion: "webp" | "original"; sharpAvailable: boolean; warnings: string[] };

export async function processStudioImageUpload(input: {
  bytes: Buffer;
  filename: string;
  declaredMime?: string;
  title?: string;
  alt?: string;
  caption?: string;
  uploader?: string;
  now?: Date;
  randomHex?: string;
  store?: MediaObjectStore;
  remove?: MediaObjectRemover;
  registerAsset?: (asset: MediaLibraryAsset) => Promise<unknown>;
}): Promise<ProcessedStudioUpload> {
  const bytes = input.bytes;
  if (!bytes || bytes.byteLength === 0) throw new MediaUploadValidationError("Uploaded file is empty.", "MEDIA_UPLOAD_EMPTY");
  const limit = maxMediaUploadBytes();
  if (bytes.byteLength > limit) throw new MediaUploadValidationError(`Image exceeds the ${Math.round(limit / (1024 * 1024))} MiB upload limit.`, "MEDIA_UPLOAD_TOO_LARGE");
  const signature = detectImageSignature(bytes);
  if (!signature) throw new MediaUploadValidationError("Unsupported image format. Use JPEG, PNG, WebP, GIF or AVIF.", "MEDIA_FORMAT_UNSUPPORTED");
  const declared = (input.declaredMime || "").split(";")[0].trim().toLowerCase();
  if (declared && declared !== "application/octet-stream" && declared !== signature.mime) throw new MediaUploadValidationError("File content does not match its declared media type.", "MEDIA_MIME_MISMATCH");

  const sharp = await loadSharp();
  let width: number | undefined;
  let height: number | undefined;
  if (sharp) {
    try {
      const metadata = await sharp(bytes, { failOn: "warning", limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
      width = metadata.width; height = metadata.height;
    } catch {
      throw new MediaUploadValidationError("Image content is invalid or malformed.", "MEDIA_IMAGE_INVALID");
    }
  }

  const store = input.store ?? defaultStore;
  const remove = input.remove ?? deleteMediaObject;
  const registerAsset = input.registerAsset ?? upsertMediaAsset;
  const warnings: string[] = [];
  // mediaStorageDiagnostics never throws on a partial configuration, so the
  // delivery-URL warning works even where credentials are absent (tests, CI).
  if (!mediaStorageDiagnostics().publicBaseUrlConfigured) {
    warnings.push("R2_PUBLIC_BASE_URL is not configured; the returned URL uses the R2 S3 endpoint and may not be publicly accessible.");
  }
  const objectMetadata = { "source-provider": "studio", "source-checksum": checksumSha256(bytes), "original-filename": input.filename.slice(0, 200) };
  const createdAt = (input.now ?? new Date()).toISOString();

  // The original source asset is always preserved, whatever happens later.
  const originalKey = buildMediaStorageKey({ filename: input.filename, now: input.now, randomHex: input.randomHex });
  const storedOriginal = await store({ key: originalKey, body: bytes, contentType: signature.mime, metadata: objectMetadata });

  const derivedKeys: string[] = [];
  let deliveredKey = originalKey;
  let deliveredUrl = storedOriginal.url;
  let deliveredMime: string | undefined;
  let deliveredBytes: Buffer = bytes;
  if (sharp && (signature.format === "jpeg" || signature.format === "png")) {
    try {
      const webp = await sharp(bytes, { failOn: "warning", limitInputPixels: MAX_IMAGE_PIXELS }).rotate().resize({ width: MAX_DELIVERED_WIDTH, height: MAX_DELIVERED_WIDTH, fit: "inside", withoutEnlargement: true }).webp({ quality: 80, effort: 6, smartSubsample: true }).toBuffer();
      const webpKey = `${originalKey.replace(/\.[a-z0-9]+$/i, "")}.webp`;
      const storedWebp = await store({ key: webpKey, body: webp, contentType: "image/webp", metadata: { ...objectMetadata, conversion: MEDIA_CONVERSION_PROFILE } });
      const webpMetadata = await sharp(webp, { failOn: "warning" }).metadata();
      deliveredKey = webpKey;
      deliveredUrl = storedWebp.url;
      deliveredMime = "image/webp";
      deliveredBytes = webp;
      derivedKeys.push(webpKey);
      if (webpMetadata.width) width = webpMetadata.width;
      if (webpMetadata.height) height = webpMetadata.height;
    } catch {
      warnings.push("WebP derivative generation failed; the original image is delivered instead.");
    }
  } else if (!sharp) {
    warnings.push("Server-side image processing is unavailable in this runtime; the original file is delivered as uploaded.");
  }

  const asset: MediaLibraryAsset = {
    id: mediaLibraryAssetId(deliveredKey),
    title: (input.title || input.filename).slice(0, 200),
    originalFilename: input.filename.slice(0, 200),
    storageKey: originalKey,
    derivedKeys,
    deliveryUrl: deliveredUrl,
    mimeType: signature.mime,
    deliveredMime,
    fileSize: bytes.byteLength,
    width,
    height,
    alt: (input.alt || "").slice(0, 300),
    caption: (input.caption || "").slice(0, 500),
    checksum: checksumSha256(deliveredBytes),
    sourceChecksum: checksumSha256(bytes),
    sourceBytes: bytes.byteLength,
    createdAt,
    uploader: (input.uploader || "studio").slice(0, 80),
  };

  try { await registerAsset(asset); }
  catch (error) {
    // A failed registry write must not strand orphaned bytes: best-effort
    // cleanup of only the objects this call created, then a controlled error.
    for (const key of [originalKey, ...derivedKeys]) { try { await remove(key); } catch { /* best effort */ } }
    throw error;
  }

  return { asset, conversion: derivedKeys.length ? "webp" : "original", sharpAvailable: Boolean(sharp), warnings };
}
