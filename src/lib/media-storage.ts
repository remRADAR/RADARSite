import { createHash } from "node:crypto";

import {
  getStorageAdapter,
  storageConfig,
  storageDiagnostics,
  type StorageProvider,
} from "./storage";

export type MediaStorageConfig = {
  provider: StorageProvider;
  bucket: string;
  endpoint: string;
  publicBaseUrl?: string;
};
export type StoredMedia = { key: string; url: string; provider: StorageProvider; bucket: string; contentType: string; size: number; etag?: string; checksum?: string; width?: number; height?: number };
export type MediaDeliveryUrlValidation = { ok: boolean; configuredBaseUrl: boolean; protocol: "https" | "other"; hostValid: boolean; semantics: "public-base" | "r2-endpoint-fallback" | "invalid" };

/**
 * Resolve the media storage configuration for the active provider.
 *
 * R2 remains the default (no `STORAGE_PROVIDER` set), so existing deployments
 * see exactly the same values as before. When `STORAGE_PROVIDER=storj` the
 * Storj bucket/endpoint/public base URL are returned instead.
 */
export function mediaStorageConfig(): MediaStorageConfig {
  const config = storageConfig();
  return {
    provider: config.provider,
    bucket: config.bucket,
    endpoint: config.endpoint,
    publicBaseUrl: config.publicBaseUrl,
  };
}

/**
 * Non-throwing diagnostics for health endpoints.
 *
 * The R2-shaped keys are always present so existing callers (notion-media)
 * keep type-checking; under Storj they are `false`, which safely disables the
 * R2-only paths rather than silently pointing them at the wrong bucket.
 */
export function mediaStorageDiagnostics() {
  const diagnostics = storageDiagnostics();
  if (diagnostics.provider === "storj") {
    return {
      ...diagnostics,
      accountIdFormatValid: false,
      bucketMatchesTarget: false,
      endpointMatchesDerivedAccount: false,
      endpointSource: "explicit" as const,
    };
  }
  return diagnostics;
}

function publicUrl(key: string, config: MediaStorageConfig) {
  return config.publicBaseUrl ? `${config.publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}` : undefined;
}
function mediaObjectUrl(key: string, config: MediaStorageConfig) { return publicUrl(key, config) || `${config.endpoint}/${config.bucket}/${key}`; }

export function checksumSha256(value: Uint8Array | Buffer) { return createHash("sha256").update(value).digest("hex"); }

export async function bodyToBuffer(body: { transformToByteArray?: () => Promise<Uint8Array>; arrayBuffer?: () => Promise<ArrayBuffer> } | undefined) {
  if (!body) throw new Error("Object body is unavailable");
  if (typeof body.transformToByteArray === "function") return Buffer.from(await body.transformToByteArray());
  if (typeof body.arrayBuffer === "function") return Buffer.from(await body.arrayBuffer());
  throw new Error("Object body is unavailable");
}

function missingObject(key: string) {
  const error = new Error(`Storage object not found: ${key}`);
  Object.assign(error, { name: "NoSuchKey", Code: "NoSuchKey", code: "NoSuchKey", $metadata: { httpStatusCode: 404 } });
  return error;
}

export function validateMediaDeliveryUrl(input: { key: string; url: string; config: MediaStorageConfig }): MediaDeliveryUrlValidation {
  try {
    const parsed = new URL(input.url);
    const protocol = parsed.protocol === "https:" ? "https" : "other";
    const endpoint = new URL(input.config.endpoint);
    const expected = mediaObjectUrl(input.key, input.config);
    const hostValid = Boolean(parsed.hostname) && parsed.hostname === new URL(expected).hostname;
    const semantics = input.config.publicBaseUrl ? "public-base" : "r2-endpoint-fallback";
    const pathValid = parsed.href === expected;
    return { ok: protocol === "https" && hostValid && pathValid, configuredBaseUrl: Boolean(input.config.publicBaseUrl), protocol, hostValid: hostValid && endpoint.protocol === "https:", semantics: protocol === "https" && hostValid && pathValid ? semantics : "invalid" };
  } catch {
    return { ok: false, configuredBaseUrl: Boolean(input.config.publicBaseUrl), protocol: "other", hostValid: false, semantics: "invalid" };
  }
}

export async function checkMediaStorage() {
  const diagnostics = mediaStorageDiagnostics();
  const config = mediaStorageConfig();
  const storage = await getStorageAdapter();
  await storage.check();
  return {
    provider: storage.provider,
    transport: storage.transport,
    bucket: storage.bucket,
    endpoint: config.endpoint,
    publicBaseUrlConfigured: Boolean(config.publicBaseUrl),
    diagnostics: {
      accountIdFormatValid: diagnostics.accountIdFormatValid,
      bucketMatchesTarget: diagnostics.bucketMatchesTarget,
      credentialsPresent: diagnostics.credentialsPresent,
      endpointFormatValid: diagnostics.endpointFormatValid,
      endpointMatchesDerivedAccount: diagnostics.endpointMatchesDerivedAccount,
      endpointSource: diagnostics.endpointSource,
      transport: storage.transport,
    },
  };
}

export async function putMediaObject(input: { key: string; body: Uint8Array | Buffer; contentType: string; cacheControl?: string; metadata?: Record<string, string> }): Promise<StoredMedia> {
  const config = mediaStorageConfig();
  const storage = await getStorageAdapter();
  const result = await storage.put(input.key, input.body, {
    contentType: input.contentType,
    cacheControl: input.cacheControl || "public, max-age=31536000, immutable",
    metadata: input.metadata,
  });
  return { key: input.key, url: mediaObjectUrl(input.key, config), provider: config.provider, bucket: config.bucket, contentType: result.contentType, size: result.size, etag: result.etag };
}
export async function headMediaObject(key: string) {
  const config = mediaStorageConfig();
  const result = await (await getStorageAdapter()).head(key);
  if (!result) throw missingObject(key);
  return { key, url: mediaObjectUrl(key, config), provider: config.provider, bucket: config.bucket, contentType: result.contentType, size: result.size, etag: result.etag, checksum: result.checksum, metadata: result.metadata };
}
export async function getMediaObject(key: string) {
  const result = await (await getStorageAdapter()).get(key);
  if (!result) throw missingObject(key);
  return { Body: { transformToByteArray: async () => new Uint8Array(result.body) }, ContentLength: result.size, ContentType: result.contentType, ETag: result.etag };
}
export async function readMediaObjectBytes(key: string) { const result = await (await getStorageAdapter()).get(key); if (!result) throw missingObject(key); return result.body; }
export async function deleteMediaObject(key: string) { await (await getStorageAdapter()).delete(key); }

export async function putStorageObject(input: { key: string; body: Uint8Array | Buffer; contentType: string; cacheControl?: string; ifMatch?: string; ifNoneMatch?: string; metadata?: Record<string, string> }) {
  const result = await (await getStorageAdapter()).put(input.key, input.body, {
    contentType: input.contentType,
    cacheControl: input.cacheControl || "no-cache, no-store, max-age=0",
    metadata: input.metadata,
    ifMatch: input.ifMatch,
    ifNoneMatch: input.ifNoneMatch,
  });
  return { key: input.key, etag: result.etag || "" };
}

export async function readStorageObject(key: string) {
  const result = await (await getStorageAdapter()).get(key);
  if (!result) throw missingObject(key);
  return { body: result.body, etag: result.etag || "" };
}

export async function headStorageObject(key: string) {
  const result = await (await getStorageAdapter()).head(key);
  if (!result) throw missingObject(key);
  return { key, etag: result.etag || "", size: result.size };
}

export async function createWebpDerivatives(input: { source: Buffer; keyPrefix: string; width?: number; height?: number; quality?: number }) {
  const { default: sharp } = await import("sharp");
  const image = sharp(input.source, { failOn: "warning" });
  const metadata = await image.metadata();
  const quality = input.quality ?? 80;
  if (!Number.isInteger(quality) || quality < 1 || quality > 100) throw new Error("WEBP_QUALITY_INVALID");
  if (input.width !== undefined && (!Number.isInteger(input.width) || input.width <= 0)) throw new Error("WEBP_WIDTH_INVALID");
  const sizes = [...new Set([input.width ?? 2400, 1600, 960, 480]
    .filter((size) => size > 0)
    .map((size) => metadata.width ? Math.min(size, metadata.width) : size))]
    .sort((a, b) => b - a);
  const derivatives: Array<{ key: string; body: Buffer; contentType: string; width: number; height?: number }> = [];
  for (const width of sizes) {
    const body = await sharp(input.source, { failOn: "warning" }).resize({ width, withoutEnlargement: true }).webp({ quality, effort: 6, smartSubsample: true }).toBuffer();
    const dimensions = await sharp(body, { failOn: "warning" }).metadata();
    if (dimensions.format !== "webp") throw new Error("WEBP_OUTPUT_FORMAT_INVALID");
    derivatives.push({ key: `${input.keyPrefix}/w-${width}.webp`, body, contentType: "image/webp", width: dimensions.width || width, height: dimensions.height });
  }
  const sourceBytes = input.source.byteLength;
  const derivativeBytes = derivatives.reduce((total, item) => total + item.body.byteLength, 0);
  return { sourceWidth: metadata.width, sourceHeight: metadata.height, sourceMimeType: metadata.format ? `image/${metadata.format}` : undefined, sourceBytes, derivativeBytes, bytesSaved: sourceBytes - derivativeBytes, savingsRatio: sourceBytes ? (sourceBytes - derivativeBytes) / sourceBytes : 0, derivatives };
}
