import { createHash } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type MediaStorageConfig = { provider: "r2"; bucket: string; endpoint: string; publicBaseUrl?: string };
export type StoredMedia = { key: string; url: string; provider: "r2"; bucket: string; contentType: string; size: number; etag?: string; checksum?: string; width?: number; height?: number };
export type MediaDeliveryUrlValidation = { ok: boolean; configuredBaseUrl: boolean; protocol: "https" | "other"; hostValid: boolean; semantics: "public-base" | "r2-endpoint-fallback" | "invalid" };

type NativeR2Object = {
  key: string;
  size: number;
  etag: string;
  httpMetadata?: { contentType?: string; cacheControl?: string };
  customMetadata?: Record<string, string>;
  checksums?: { sha256?: ArrayBuffer };
  arrayBuffer?: () => Promise<ArrayBuffer>;
};
type NativeR2Bucket = {
  list(options?: { limit?: number }): Promise<unknown>;
  head(key: string): Promise<NativeR2Object | null>;
  get(key: string): Promise<(NativeR2Object & { arrayBuffer: () => Promise<ArrayBuffer> }) | null>;
  put(key: string, value: Uint8Array | ArrayBuffer | string | Blob | null, options?: {
    httpMetadata?: { contentType?: string; cacheControl?: string };
    customMetadata?: Record<string, string>;
    onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string };
  }): Promise<NativeR2Object | null>;
  delete(key: string): Promise<void>;
};
type R2ObjectInfo = { key: string; size: number; etag?: string; contentType: string; checksum?: string; metadata: Record<string, string> };
type R2ObjectData = R2ObjectInfo & { body: Buffer };
type R2Backend = {
  transport: "workers-binding" | "s3-compatible";
  check(): Promise<void>;
  put(key: string, body: Uint8Array | Buffer, contentType: string, cacheControl: string, metadata?: Record<string, string>, conditions?: { ifMatch?: string; ifNoneMatch?: string }): Promise<R2ObjectInfo>;
  head(key: string): Promise<R2ObjectInfo | null>;
  get(key: string): Promise<R2ObjectData | null>;
  delete(key: string): Promise<void>;
};

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
  return {
    accountId,
    bucket,
    endpoint,
    endpointSource: process.env.R2_ENDPOINT ? "explicit" : "derived",
    accountIdFormatValid: /^[a-f0-9]{32}$/.test(accountId),
    bucketMatchesTarget: bucket === "radarsite-media",
    credentialsPresent: Boolean(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY),
    endpointFormatValid: Boolean(parsed && parsed.protocol === "https:" && parsed.hostname === `${accountId}.r2.cloudflarestorage.com` && parsed.pathname === "/" && !parsed.search && !parsed.hash && !parsed.username && !parsed.password && !parsed.port),
    endpointMatchesDerivedAccount: endpoint === expectedEndpoint,
  };
}
function assertMediaStorageConfig(config: MediaStorageConfig, transport: R2Backend["transport"] = "s3-compatible") {
  const diagnostics = mediaStorageDiagnostics();
  if (!diagnostics.accountIdFormatValid || !diagnostics.bucketMatchesTarget || (transport === "s3-compatible" && !diagnostics.credentialsPresent) || !diagnostics.endpointFormatValid) {
    throw new Error(`Invalid R2 configuration: ${JSON.stringify({ ...diagnostics, accountId: diagnostics.accountId ? "valid-format" : "missing", endpoint: diagnostics.endpoint ? "present" : "missing" })}`);
  }
  return config;
}
function client(config = mediaStorageConfig()) {
  return new S3Client({ region: "auto", endpoint: config.endpoint, forcePathStyle: false, credentials: { accessKeyId: required("R2_ACCESS_KEY_ID"), secretAccessKey: required("R2_SECRET_ACCESS_KEY") } });
}
async function nativeBucket(): Promise<NativeR2Bucket | undefined> {
  let workerModule: { env: unknown };
  try {
    // @ts-expect-error -- supplied by the Cloudflare Vite/Vinext runtime, not by Vercel's Node runtime
    workerModule = await import("cloudflare:workers");
  } catch { return undefined; }
  const environment = workerModule.env as { RADARSITE_MEDIA?: NativeR2Bucket; RADARSITE_R2_TRANSPORT?: string };
  if (environment.RADARSITE_MEDIA) return environment.RADARSITE_MEDIA;
  if (environment.RADARSITE_R2_TRANSPORT === "native") throw new Error("Native R2 binding RADARSITE_MEDIA is missing");
  return undefined;
}
function etag(value?: string) { return value?.replaceAll('"', ""); }
function checksumHex(value?: ArrayBuffer) { return value ? Buffer.from(value).toString("hex") : undefined; }
function missingObject(key: string) {
  const error = new Error(`R2 object not found: ${key}`);
  Object.assign(error, { name: "NoSuchKey", Code: "NoSuchKey", code: "NoSuchKey", $metadata: { httpStatusCode: 404 } });
  return error;
}
function conditionalWriteError() {
  const error = new Error("Cloudflare R2 write precondition failed");
  Object.assign(error, { name: "PreconditionFailed", Code: "PreconditionFailed", code: "PreconditionFailed", $metadata: { httpStatusCode: 412 } });
  return error;
}
function nativeInfo(object: NativeR2Object): R2ObjectInfo {
  return { key: object.key, size: object.size, etag: etag(object.etag), contentType: object.httpMetadata?.contentType || "application/octet-stream", checksum: checksumHex(object.checksums?.sha256), metadata: object.customMetadata || {} };
}
async function backend(config = mediaStorageConfig()): Promise<R2Backend> {
  const native = await nativeBucket();
  if (native) {
    return {
      transport: "workers-binding",
      check: async () => { await native.list({ limit: 1 }); },
      put: async (key, body, contentType, cacheControl, metadata, conditions) => {
        const onlyIf = conditions?.ifMatch ? { etagMatches: conditions.ifMatch } : conditions?.ifNoneMatch ? { etagDoesNotMatch: conditions.ifNoneMatch } : undefined;
        const result = await native.put(key, body, { httpMetadata: { contentType, cacheControl }, ...(metadata ? { customMetadata: metadata } : {}), ...(onlyIf ? { onlyIf } : {}) });
        if (!result) throw conditionalWriteError();
        return nativeInfo(result);
      },
      head: async (key) => {
        const result = await native.head(key);
        return result ? nativeInfo(result) : null;
      },
      get: async (key) => {
        const result = await native.get(key);
        if (!result) return null;
        return { ...nativeInfo(result), body: Buffer.from(await result.arrayBuffer()) };
      },
      delete: async (key) => { await native.delete(key); },
    };
  }

  const s3 = client(config);
  return {
    transport: "s3-compatible",
    check: async () => { await s3.send(new HeadBucketCommand({ Bucket: config.bucket })); },
    put: async (key, body, contentType, cacheControl, metadata, conditions) => {
      const response = await s3.send(new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
        Metadata: metadata,
        ...(conditions?.ifMatch ? { IfMatch: conditions.ifMatch } : {}),
        ...(conditions?.ifNoneMatch ? { IfNoneMatch: conditions.ifNoneMatch } : {}),
      }));
      return { key, size: body.byteLength, etag: etag(response.ETag), contentType, metadata: metadata || {} };
    },
    head: async (key) => {
      const response = await s3.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
      return { key, size: response.ContentLength || 0, etag: etag(response.ETag), contentType: response.ContentType || "application/octet-stream", checksum: response.ChecksumSHA256, metadata: response.Metadata || {} };
    },
    get: async (key) => {
      const response = await s3.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
      if (!response.Body) throw missingObject(key);
      return { key, body: await bodyToBuffer(response.Body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined), size: response.ContentLength || 0, etag: etag(response.ETag), contentType: response.ContentType || "application/octet-stream", checksum: response.ChecksumSHA256, metadata: response.Metadata || {} };
    },
    delete: async (key) => { await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key })); },
  };
}
function publicUrl(key: string, config: MediaStorageConfig) { return config.publicBaseUrl ? `${config.publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}` : undefined; }
function mediaObjectUrl(key: string, config: MediaStorageConfig) { return publicUrl(key, config) || `${config.endpoint}/${config.bucket}/${key}`; }

export function checksumSha256(value: Uint8Array | Buffer) { return createHash("sha256").update(value).digest("hex"); }

export async function bodyToBuffer(body: { transformToByteArray?: () => Promise<Uint8Array>; arrayBuffer?: () => Promise<ArrayBuffer> } | undefined) {
  if (!body) throw new Error("R2 object body is unavailable");
  if (typeof body.transformToByteArray === "function") return Buffer.from(await body.transformToByteArray());
  if (typeof body.arrayBuffer === "function") return Buffer.from(await body.arrayBuffer());
  throw new Error("R2 object body is unavailable");
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
  const storage = await backend(config);
  assertMediaStorageConfig(config, storage.transport);
  await storage.check();
  return { provider: config.provider, transport: storage.transport, bucket: config.bucket, endpoint: config.endpoint, publicBaseUrlConfigured: Boolean(config.publicBaseUrl), diagnostics: { accountIdFormatValid: diagnostics.accountIdFormatValid, bucketMatchesTarget: diagnostics.bucketMatchesTarget, credentialsPresent: diagnostics.credentialsPresent, endpointFormatValid: diagnostics.endpointFormatValid, endpointMatchesDerivedAccount: diagnostics.endpointMatchesDerivedAccount, endpointSource: diagnostics.endpointSource, transport: storage.transport } };
}

export async function putMediaObject(input: { key: string; body: Uint8Array | Buffer; contentType: string; cacheControl?: string; metadata?: Record<string, string> }): Promise<StoredMedia> {
  const config = mediaStorageConfig();
  const storage = await backend(config);
  const result = await storage.put(input.key, input.body, input.contentType, input.cacheControl || "public, max-age=31536000, immutable", input.metadata);
  return { key: input.key, url: mediaObjectUrl(input.key, config), provider: config.provider, bucket: config.bucket, contentType: result.contentType, size: result.size, etag: result.etag };
}
export async function headMediaObject(key: string) {
  const config = mediaStorageConfig();
  const result = await (await backend(config)).head(key);
  if (!result) throw missingObject(key);
  return { key, url: mediaObjectUrl(key, config), provider: config.provider, bucket: config.bucket, contentType: result.contentType, size: result.size, etag: result.etag, checksum: result.checksum, metadata: result.metadata };
}
export async function getMediaObject(key: string) {
  const result = await (await backend()).get(key);
  if (!result) throw missingObject(key);
  return { Body: { transformToByteArray: async () => new Uint8Array(result.body) }, ContentLength: result.size, ContentType: result.contentType, ETag: result.etag };
}
export async function readMediaObjectBytes(key: string) { const result = await (await backend()).get(key); if (!result) throw missingObject(key); return result.body; }
export async function deleteMediaObject(key: string) { await (await backend()).delete(key); }

export async function putStorageObject(input: { key: string; body: Uint8Array | Buffer; contentType: string; cacheControl?: string; ifMatch?: string; ifNoneMatch?: string; metadata?: Record<string, string> }) {
  const config = mediaStorageConfig();
  const result = await (await backend(config)).put(input.key, input.body, input.contentType, input.cacheControl || "no-cache, no-store, max-age=0", input.metadata, { ifMatch: input.ifMatch, ifNoneMatch: input.ifNoneMatch });
  return { key: input.key, etag: result.etag || "" };
}

export async function readStorageObject(key: string) {
  const result = await (await backend()).get(key);
  if (!result) throw missingObject(key);
  return { body: result.body, etag: result.etag || "" };
}

export async function headStorageObject(key: string) {
  const result = await (await backend()).head(key);
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
