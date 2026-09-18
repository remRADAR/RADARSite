import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type MediaStorageConfig = { provider: "r2"; bucket: string; endpoint: string; publicBaseUrl?: string };
export type StoredMedia = { key: string; url: string; provider: "r2"; bucket: string; contentType: string; size: number; etag?: string; checksum?: string; width?: number; height?: number };

function required(name: string) { const value = process.env[name]; if (!value) throw new Error(`${name} is not configured`); return value; }
export function mediaStorageConfig(): MediaStorageConfig {
  const accountId = required("R2_ACCOUNT_ID");
  return { provider: "r2", bucket: required("R2_BUCKET"), endpoint: process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`, publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "") };
}
function client(config = mediaStorageConfig()) { return new S3Client({ region: "auto", endpoint: config.endpoint, forcePathStyle: false, credentials: { accessKeyId: required("R2_ACCESS_KEY_ID"), secretAccessKey: required("R2_SECRET_ACCESS_KEY") } }); }
function publicUrl(key: string, config: MediaStorageConfig) { return config.publicBaseUrl ? `${config.publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}` : undefined; }
function etag(value?: string) { return value?.replaceAll('"', ""); }

export async function checkMediaStorage() {
  const config = mediaStorageConfig();
  await client(config).send(new HeadBucketCommand({ Bucket: config.bucket }));
  return { provider: config.provider, bucket: config.bucket, endpoint: config.endpoint, publicBaseUrlConfigured: Boolean(config.publicBaseUrl) };
}

export async function putMediaObject(input: { key: string; body: Uint8Array | Buffer; contentType: string; cacheControl?: string; metadata?: Record<string, string> }): Promise<StoredMedia> {
  const config = mediaStorageConfig();
  const response = await client(config).send(new PutObjectCommand({ Bucket: config.bucket, Key: input.key, Body: input.body, ContentType: input.contentType, CacheControl: input.cacheControl || "public, max-age=31536000, immutable", Metadata: input.metadata }));
  return { key: input.key, url: publicUrl(input.key, config) || `${config.endpoint}/${config.bucket}/${input.key}`, provider: config.provider, bucket: config.bucket, contentType: input.contentType, size: input.body.byteLength, etag: etag(response.ETag) };
}
export async function headMediaObject(key: string) { const config = mediaStorageConfig(); const response = await client(config).send(new HeadObjectCommand({ Bucket: config.bucket, Key: key })); return { key, url: publicUrl(key, config) || `${config.endpoint}/${config.bucket}/${key}`, provider: config.provider, bucket: config.bucket, contentType: response.ContentType || "application/octet-stream", size: response.ContentLength || 0, etag: etag(response.ETag), checksum: response.ChecksumSHA256, metadata: response.Metadata || {} }; }
export async function getMediaObject(key: string) { const config = mediaStorageConfig(); return client(config).send(new GetObjectCommand({ Bucket: config.bucket, Key: key })); }
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
