import { createHash } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type MediaStorageConfig = { provider: "r2"; bucket: string; endpoint: string; publicBaseUrl?: string };
export type StoredMedia = { key: string; url: string; provider: "r2"; bucket: string; contentType: string; size: number; etag?: string; checksum?: string; width?: number; height?: number };
export type MediaDeliveryUrlValidation = { ok: boolean; configuredBaseUrl: boolean; protocol: "https" | "other"; hostValid: boolean; semantics: "public-base" | "r2-endpoint-fallback" | "invalid" };

function required(name: string) { const value = process.env[name]; if (!value) throw new Error(`${name} is not configured`); return value; }
export function mediaStorageConfig(): MediaStorageConfig {
  const accountId = required("R2_ACCOUNT_ID");
  return { provider: "r2", bucket: required("R2_BUCKET"), endpoint: process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`, publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "") };
}
export function mediaStorageDiagnostics() {
  const accountId = process.env.R2_ACCOUNT_ID || "";
  const bucket = process.env.R2_BUCKET || "";
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  let parsed: URL | undefined;
  try { parsed = endpoint ? new URL(endpoint) : undefined; } catch { parsed = undefined; }
  const expectedEndpoint = accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "";
  return { accountId, bucket, endpoint, endpointSource: process.env.R2_ENDPOINT ? "explicit" : "derived", accountIdFormatValid: /^[a-f0-9]{32}$/.test(accountId), bucketMatchesTarget: bucket === "radarsite-media", credentialsPresent: Boolean(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY), endpointFormatValid: Boolean(parsed && parsed.protocol === "https:" && parsed.hostname === `${accountId}.r2.cloudflarestorage.com` && parsed.pathname === "/" && !parsed.search && !parsed.hash && !parsed.username && !parsed.password && !parsed.port), endpointMatchesDerivedAccount: endpoint === expectedEndpoint };
}
function assertMediaStorageConfig(config: MediaStorageConfig) { const diagnostics = mediaStorageDiagnostics(); if (!diagnostics.accountIdFormatValid || !diagnostics.bucketMatchesTarget || !diagnostics.credentialsPresent || !diagnostics.endpointFormatValid) throw new Error(`Invalid R2 configuration: ${JSON.stringify({ ...diagnostics, accountId: diagnostics.accountId ? "valid-format" : "missing", endpoint: diagnostics.endpoint ? "present" : "missing" })}`); return config; }
function client(config = mediaStorageConfig()) { return new S3Client({ region: "auto", endpoint: config.endpoint, forcePathStyle: false, credentials: { accessKeyId: required("R2_ACCESS_KEY_ID"), secretAccessKey: required("R2_SECRET_ACCESS_KEY") } }); }
function publicUrl(key: string, config: MediaStorageConfig) { return config.publicBaseUrl ? `${config.publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}` : undefined; }
function mediaObjectUrl(key: string, config: MediaStorageConfig) { return publicUrl(key, config) || `${config.endpoint}/${config.bucket}/${key}`; }
function etag(value?: string) { return value?.replaceAll('"', ""); }

export function checksumSha256(value: Uint8Array | Buffer) { return createHash("sha256").update(value).digest("hex"); }

export async function bodyToBuffer(body: { transformToByteArray?: () => Promise<Uint8Array> } | undefined) {
  if (!body || typeof body.transformToByteArray !== "function") throw new Error("R2 object body is unavailable");
  return Buffer.from(await body.transformToByteArray());
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
  const config = assertMediaStorageConfig(mediaStorageConfig());
  await client(config).send(new HeadBucketCommand({ Bucket: config.bucket }));
  return { provider: config.provider, bucket: config.bucket, endpoint: config.endpoint, publicBaseUrlConfigured: Boolean(config.publicBaseUrl), diagnostics: { accountIdFormatValid: diagnostics.accountIdFormatValid, bucketMatchesTarget: diagnostics.bucketMatchesTarget, credentialsPresent: diagnostics.credentialsPresent, endpointFormatValid: diagnostics.endpointFormatValid, endpointMatchesDerivedAccount: diagnostics.endpointMatchesDerivedAccount, endpointSource: diagnostics.endpointSource } };
}

export async function putMediaObject(input: { key: string; body: Uint8Array | Buffer; contentType: string; cacheControl?: string; metadata?: Record<string, string> }): Promise<StoredMedia> {
  const config = mediaStorageConfig();
  const url = mediaObjectUrl(input.key, config);
  const response = await client(config).send(new PutObjectCommand({ Bucket: config.bucket, Key: input.key, Body: input.body, ContentType: input.contentType, CacheControl: input.cacheControl || "public, max-age=31536000, immutable", Metadata: input.metadata }));
  return { key: input.key, url, provider: config.provider, bucket: config.bucket, contentType: input.contentType, size: input.body.byteLength, etag: etag(response.ETag) };
}
export async function headMediaObject(key: string) { const config = mediaStorageConfig(); const response = await client(config).send(new HeadObjectCommand({ Bucket: config.bucket, Key: key })); return { key, url: mediaObjectUrl(key, config), provider: config.provider, bucket: config.bucket, contentType: response.ContentType || "application/octet-stream", size: response.ContentLength || 0, etag: etag(response.ETag), checksum: response.ChecksumSHA256, metadata: response.Metadata || {} }; }
export async function getMediaObject(key: string) { const config = mediaStorageConfig(); return client(config).send(new GetObjectCommand({ Bucket: config.bucket, Key: key })); }
export async function readMediaObjectBytes(key: string) { const object = await getMediaObject(key); return bodyToBuffer(object.Body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined); }
export async function deleteMediaObject(key: string) { const config = mediaStorageConfig(); await client(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key })); }

export async function createWebpDerivatives(input: { source: Buffer; keyPrefix: string; width?: number; height?: number; quality?: number }) {
  const { default: sharp } = await import("sharp");
  const image = sharp(input.source, { failOn: "warning" });
  const metadata = await image.metadata();
  const quality = input.quality || 82;
  const sizes = [...new Set([input.width || 2400, 1600, 960, 480].filter((size) => size > 0 && (!metadata.width || size <= metadata.width || size === input.width)))].sort((a, b) => b - a);
  const derivatives: Array<{ key: string; body: Buffer; contentType: string; width: number; height?: number }> = [];
  for (const width of sizes) {
    const body = await sharp(input.source).resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer();
    const dimensions = await sharp(body).metadata();
    derivatives.push({ key: `${input.keyPrefix}/w-${width}.webp`, body, contentType: "image/webp", width: dimensions.width || width, height: dimensions.height });
  }
  return { sourceWidth: metadata.width, sourceHeight: metadata.height, sourceMimeType: metadata.format ? `image/${metadata.format}` : undefined, derivatives };
}
