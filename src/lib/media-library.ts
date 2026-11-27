/**
 * RADAR Media Library registry.
 *
 * The media library is a versioned JSON manifest stored in the same Cloudflare
 * storage bucket as every other CMS artefact (`content/media-library-v1.json`),
 * guarded by the same etag compare-and-swap discipline as the public content
 * state (`src/lib/cloudflare-content-store.ts`). This keeps one storage
 * system, works in both supported runtimes (native Worker R2 binding and the
 * S3-compatible API used by scripts), and requires no database migration.
 *
 * Three identities stay distinct:
 *   1. the physical image object in Cloudflare storage,
 *   2. its metadata record (an asset entry in this manifest),
 *   3. its usage inside an article (featuredImage / bodyHtml references).
 *
 * Deleting an article reference never deletes the object; deleting an asset
 * goes through `deletionGuard` with explicit reference checks.
 *
 * This module must stay free of next/cache and database imports so contract
 * tests can exercise the pure helpers with tsx.
 */

import { createHash } from "node:crypto";

import { putStorageObject, readStorageObject } from "@/lib/media-storage";
import { isCloudflareConditionalWriteConflict } from "@/lib/cloudflare-content-store";

export const MEDIA_LIBRARY_MANIFEST_KEY = "content/media-library-v1.json";
export const MEDIA_LIBRARY_VERSION = 1;
export const MAX_MEDIA_LIBRARY_ASSETS = 2000;
export const CAS_RETRY_ATTEMPTS = 3;

export type MediaLibraryRole = "featured" | "social" | "inline";

export type MediaLibraryAsset = {
  id: string;
  title: string;
  originalFilename: string;
  storageKey: string;
  derivedKeys: string[];
  deliveryUrl: string;
  mimeType: string;
  deliveredMime?: string;
  fileSize: number;
  width?: number;
  height?: number;
  alt: string;
  caption: string;
  checksum: string;
  sourceChecksum?: string;
  sourceBytes?: number;
  createdAt: string;
  uploader: string;
};

export type MediaLibraryManifest = { version: 1; updatedAt: string; assets: MediaLibraryAsset[] };
export type MediaLibrarySnapshot = { manifest: MediaLibraryManifest | null; etag: string | null };

export const ALLOWED_MEDIA_FORMATS: Record<string, { mime: string; extensions: string[] }> = {
  jpeg: { mime: "image/jpeg", extensions: ["jpg", "jpeg"] },
  png: { mime: "image/png", extensions: ["png"] },
  webp: { mime: "image/webp", extensions: ["webp"] },
  gif: { mime: "image/gif", extensions: ["gif"] },
  avif: { mime: "image/avif", extensions: ["avif"] },
};

export const MEDIA_MIME_TYPES = [...new Set(Object.values(ALLOWED_MEDIA_FORMATS).map((format) => format.mime))];

/** Deterministic asset id derived from the delivered storage key. */
export function mediaLibraryAssetId(storageKey: string) {
  return `studio-media:${createHash("sha256").update(storageKey).digest("hex")}`;
}

/** Reduce a client-supplied filename to a safe basename plus a known extension. */
export function sanitizeMediaFilename(filename: string): { base: string; extension: string } | null {
  const name = (filename || "").split(/[/\\]/).pop() || "";
  const dot = name.lastIndexOf(".");
  const rawBase = (dot > 0 ? name.slice(0, dot) : name).toLowerCase();
  const rawExtension = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  const knownExtension = Object.values(ALLOWED_MEDIA_FORMATS).some((format) => format.extensions.includes(rawExtension));
  if (!knownExtension) return null;
  const base = rawBase.replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[.\-]+/, "").replace(/[.\-]+$/, "").slice(0, 80);
  if (!base) return null;
  return { base, extension: rawExtension };
}

/**
 * Unique, traversal-safe storage key for one upload. The random segment makes
 * every upload unique, so a duplicate filename can never overwrite an existing
 * asset. Only callers that control `randomHex` (tests) get deterministic keys.
 */
export function buildMediaStorageKey(input: { filename: string; now?: Date; randomHex?: string }): string {
  const parsed = sanitizeMediaFilename(input.filename);
  if (!parsed) throw new Error("MEDIA_FILENAME_INVALID");
  const stamp = input.now ?? new Date();
  const year = stamp.getUTCFullYear();
  const month = String(stamp.getUTCMonth() + 1).padStart(2, "0");
  const random = input.randomHex ?? createHash("sha256").update(`${input.filename}:${stamp.getTime()}:${Math.random()}`).digest("hex").slice(0, 16);
  if (!/^[a-f0-9]{8,64}$/.test(random)) throw new Error("MEDIA_RANDOM_INVALID");
  const extension = parsed.extension === "jpeg" ? "jpg" : parsed.extension;
  return `studio/assets/${year}/${month}/${random}-${parsed.base}.${extension}`;
}

/** Only generated media keys (and Notion's checksum-addressed keys) may enter the registry. */
export function isSafeMediaStorageKey(key: string) {
  if (typeof key !== "string" || key.includes("..")) return false;
  return /^studio\/assets\/\d{4}\/\d{2}\/[a-f0-9]{8,64}-[a-z0-9._-]{1,80}\.(jpg|jpeg|png|webp|gif|avif)$/.test(key) || /^notion\/assets\/[a-f0-9]{2}\/[a-f0-9]{64}\.(jpg|jpeg|png|webp|gif|avif)$/.test(key);
}

/**
 * Identify an image by its file signature (magic bytes), not by filename or
 * declared MIME type. Returns null for anything that is not a supported image.
 */
export function detectImageSignature(bytes: Uint8Array): { format: string; mime: string } | null {
  if (!bytes || bytes.length < 12) return null;
  const startsWith = (signature: number[], offset = 0) => signature.every((value, index) => bytes[offset + index] === value);
  if (startsWith([0xff, 0xd8, 0xff])) return { format: "jpeg", mime: "image/jpeg" };
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { format: "png", mime: "image/png" };
  if (startsWith([0x47, 0x49, 0x46, 0x38])) return { format: "gif", mime: "image/gif" };
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return { format: "webp", mime: "image/webp" };
  if (startsWith([0x66, 0x74, 0x79, 0x70], 4)) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
    return brand.startsWith("avi") ? { format: "avif", mime: "image/avif" } : null;
  }
  return null;
}

export type MediaUsageRecord = { id?: string; slug?: string; title?: string; status?: string; featuredImage?: string; imageUrl?: string; socialImage?: string; bodyHtml?: string };
export type MediaReference = { id: string; slug: string; title: string; status: string; roles: MediaLibraryRole[] };

/**
 * Find every article that still references an asset. Matching is by storage
 * key (raw and URL-encoded form), so references survive either URL shape.
 */
export function findMediaReferences(asset: Pick<MediaLibraryAsset, "storageKey" | "deliveryUrl">, records: readonly MediaUsageRecord[]): MediaReference[] {
  const encodedKey = asset.storageKey.split("/").map(encodeURIComponent).join("/");
  const matches = (value: string | undefined) => Boolean(value && (value.includes(asset.storageKey) || value.includes(encodedKey)));
  const references: MediaReference[] = [];
  for (const record of records) {
    const roles: MediaLibraryRole[] = [];
    if (matches(record.featuredImage) || matches(record.imageUrl)) roles.push("featured");
    if (matches(record.socialImage)) roles.push("social");
    if (matches(record.bodyHtml)) roles.push("inline");
    if (!roles.length) continue;
    references.push({ id: record.id || "", slug: record.slug || "", title: record.title || "Untitled article", status: record.status || "published", roles });
  }
  return references;
}

/** Deletion is only allowed through a deliberate action; referenced assets require force. */
export function deletionGuard(input: { references: MediaReference[]; force: boolean }): { allowed: boolean; reason?: string } {
  if (!input.references.length || input.force) return { allowed: true };
  return { allowed: false, reason: `This asset is still used by ${input.references.length} article(s). Remove those references first, or repeat the request with force=true to delete it anyway.` };
}

export type MediaLibraryQuery = { search?: string; mime?: string; page?: number; pageSize?: number };

/** Server-side search/filter/pagination over the manifest (newest first). */
export function filterMediaAssets(assets: readonly MediaLibraryAsset[], query: MediaLibraryQuery) {
  const search = (query.search || "").trim().toLowerCase();
  const mime = (query.mime || "").trim().toLowerCase();
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(60, Math.max(6, Number(query.pageSize) || 24));
  const filtered = assets
    .filter((asset) => {
      const haystack = `${asset.title} ${asset.originalFilename} ${asset.alt} ${asset.caption}`.toLowerCase();
      return (!search || haystack.includes(search)) && (!mime || asset.mimeType === mime || asset.deliveredMime === mime);
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  const total = filtered.length;
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize), pagination: { page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) } };
}

function normalizeMediaAsset(input: unknown): MediaLibraryAsset {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("MEDIA_ASSET_INVALID");
  const value = input as Record<string, unknown>;
  const str = (key: string, max: number) => (typeof value[key] === "string" ? (value[key] as string).slice(0, max) : "");
  const storageKey = str("storageKey", 300);
  if (!isSafeMediaStorageKey(storageKey)) throw new Error("MEDIA_ASSET_STORAGE_KEY_INVALID");
  const deliveryUrl = str("deliveryUrl", 2000);
  if (!/^https:\/\//.test(deliveryUrl)) throw new Error("MEDIA_ASSET_DELIVERY_URL_INVALID");
  const fileSize = Number(value.fileSize);
  if (!Number.isSafeInteger(fileSize) || fileSize < 0) throw new Error("MEDIA_ASSET_FILE_SIZE_INVALID");
  const width = Number(value.width);
  const height = Number(value.height);
  return {
    id: str("id", 120) || mediaLibraryAssetId(storageKey),
    title: str("title", 200),
    originalFilename: str("originalFilename", 200),
    storageKey,
    derivedKeys: Array.isArray(value.derivedKeys) ? value.derivedKeys.filter((item): item is string => typeof item === "string" && isSafeMediaStorageKey(item)).slice(0, 12) : [],
    deliveryUrl,
    mimeType: str("mimeType", 100),
    deliveredMime: str("deliveredMime", 100) || undefined,
    fileSize,
    width: Number.isInteger(width) && width > 0 ? width : undefined,
    height: Number.isInteger(height) && height > 0 ? height : undefined,
    alt: str("alt", 300),
    caption: str("caption", 500),
    checksum: str("checksum", 64),
    sourceChecksum: str("sourceChecksum", 64) || undefined,
    sourceBytes: Number.isSafeInteger(Number(value.sourceBytes)) && Number(value.sourceBytes) > 0 ? Number(value.sourceBytes) : undefined,
    createdAt: str("createdAt", 40),
    uploader: str("uploader", 80) || "studio",
  };
}

export function validateMediaLibraryManifest(input: unknown): MediaLibraryManifest {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("MEDIA_LIBRARY_MANIFEST_INVALID");
  const value = input as { version?: unknown; updatedAt?: unknown; assets?: unknown };
  if (value.version !== MEDIA_LIBRARY_VERSION || !Array.isArray(value.assets)) throw new Error("MEDIA_LIBRARY_MANIFEST_INVALID");
  if (value.assets.length > MAX_MEDIA_LIBRARY_ASSETS) throw new Error("MEDIA_LIBRARY_MANIFEST_TOO_LARGE");
  const assets = value.assets.map(normalizeMediaAsset);
  return { version: MEDIA_LIBRARY_VERSION, updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(), assets };
}

function isMissingStorageObject(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { name?: string; Code?: string; code?: string; $metadata?: { httpStatusCode?: number } };
  return value.$metadata?.httpStatusCode === 404 || ["NotFound", "NoSuchKey", "NotFoundException"].includes(value.name || value.Code || value.code || "");
}

/** Read the manifest. A missing object is an empty library, not an error. */
export async function readMediaLibrary(): Promise<MediaLibrarySnapshot> {
  try {
    const object = await readStorageObject(MEDIA_LIBRARY_MANIFEST_KEY);
    return { manifest: validateMediaLibraryManifest(JSON.parse(object.body.toString("utf8"))), etag: object.etag };
  } catch (error) {
    if (isMissingStorageObject(error)) return { manifest: null, etag: null };
    throw error;
  }
}

async function writeMediaLibrary(manifest: MediaLibraryManifest, expectedEtag: string | null): Promise<string> {
  const result = await putStorageObject({
    key: MEDIA_LIBRARY_MANIFEST_KEY,
    body: Buffer.from(JSON.stringify(manifest)),
    contentType: "application/json; charset=utf-8",
    cacheControl: "no-cache, no-store, max-age=0",
    ...(expectedEtag ? { ifMatch: expectedEtag } : { ifNoneMatch: "*" }),
  });
  return result.etag;
}

/** Insert or update one asset with compare-and-swap retries against concurrent uploads. */
export async function upsertMediaAsset(asset: MediaLibraryAsset): Promise<MediaLibraryAsset> {
  for (let attempt = 0; attempt < CAS_RETRY_ATTEMPTS; attempt++) {
    const { manifest, etag } = await readMediaLibrary();
    const next: MediaLibraryManifest = {
      version: MEDIA_LIBRARY_VERSION,
      updatedAt: new Date().toISOString(),
      assets: [asset, ...(manifest?.assets ?? []).filter((item) => item.id !== asset.id)].slice(0, MAX_MEDIA_LIBRARY_ASSETS),
    };
    try { await writeMediaLibrary(next, etag); return asset; }
    catch (error) { if (!isCloudflareConditionalWriteConflict(error) || attempt === CAS_RETRY_ATTEMPTS - 1) throw error; }
  }
  throw new Error("MEDIA_LIBRARY_WRITE_CONFLICT");
}

/** Remove one asset from the registry. Returns the removed asset, or null when absent. */
export async function removeMediaAsset(id: string): Promise<MediaLibraryAsset | null> {
  for (let attempt = 0; attempt < CAS_RETRY_ATTEMPTS; attempt++) {
    const { manifest, etag } = await readMediaLibrary();
    const asset = manifest?.assets.find((item) => item.id === id) ?? null;
    if (!asset) return null;
    const next: MediaLibraryManifest = { version: MEDIA_LIBRARY_VERSION, updatedAt: new Date().toISOString(), assets: manifest.assets.filter((item) => item.id !== id) };
    try { await writeMediaLibrary(next, etag); return asset; }
    catch (error) { if (!isCloudflareConditionalWriteConflict(error) || attempt === CAS_RETRY_ATTEMPTS - 1) throw error; }
  }
  throw new Error("MEDIA_LIBRARY_WRITE_CONFLICT");
}

export async function getMediaAsset(id: string): Promise<MediaLibraryAsset | null> {
  const { manifest } = await readMediaLibrary();
  return manifest?.assets.find((item) => item.id === id) ?? null;
}
