/**
 * Cloudflare R2 adapter.
 *
 * Preserves the two transports the existing code already used:
 *
 *  1. `workers-binding` — the native `RADARSITE_MEDIA` R2 binding, available
 *     inside the Cloudflare Worker runtime. Preferred when present.
 *  2. `s3-compatible`   — the R2 S3 API, used from Node scripts and anywhere
 *     the binding is not available.
 *
 * Behaviour is unchanged from the pre-adapter implementation: same binding
 * name, same `RADARSITE_R2_TRANSPORT=native` assertion, same conditional-write
 * semantics, same ETag normalisation.
 */

import {
  joinPublicUrl,
  type StorageAdapter,
  type StorageListOptions,
  type StorageListResult,
  type StorageObjectData,
  type StorageObjectInfo,
  type StoragePutOptions,
} from "./types";
import type { R2StorageConfig } from "./config";
import { createS3Adapter } from "./s3";

type NativeR2Object = {
  key: string;
  size: number;
  etag: string;
  uploaded?: Date;
  httpMetadata?: { contentType?: string; cacheControl?: string };
  customMetadata?: Record<string, string>;
  checksums?: { sha256?: ArrayBuffer };
  arrayBuffer?: () => Promise<ArrayBuffer>;
};

type NativeR2ListResult = {
  objects?: NativeR2Object[];
  truncated?: boolean;
  cursor?: string;
};

type NativeR2Bucket = {
  list(options?: { limit?: number; prefix?: string; cursor?: string }): Promise<NativeR2ListResult>;
  head(key: string): Promise<NativeR2Object | null>;
  get(key: string): Promise<(NativeR2Object & { arrayBuffer: () => Promise<ArrayBuffer> }) | null>;
  put(
    key: string,
    value: Uint8Array | ArrayBuffer | string | Blob | null,
    options?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
      customMetadata?: Record<string, string>;
      onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string };
    },
  ): Promise<NativeR2Object | null>;
  delete(key: string): Promise<void>;
};

function etag(value?: string) {
  return value?.replaceAll('"', "");
}

function checksumHex(value?: ArrayBuffer) {
  return value ? Buffer.from(value).toString("hex") : undefined;
}

function missingObject(key: string) {
  const error = new Error(`R2 object not found: ${key}`);
  Object.assign(error, {
    name: "NoSuchKey",
    Code: "NoSuchKey",
    code: "NoSuchKey",
    $metadata: { httpStatusCode: 404 },
  });
  return error;
}

function conditionalWriteError() {
  const error = new Error("Cloudflare R2 write precondition failed");
  Object.assign(error, {
    name: "PreconditionFailed",
    Code: "PreconditionFailed",
    code: "PreconditionFailed",
    $metadata: { httpStatusCode: 412 },
  });
  return error;
}

function nativeInfo(object: NativeR2Object): StorageObjectInfo {
  return {
    key: object.key,
    size: object.size,
    etag: etag(object.etag),
    contentType: object.httpMetadata?.contentType || "application/octet-stream",
    checksum: checksumHex(object.checksums?.sha256),
    metadata: object.customMetadata || {},
  };
}

/**
 * Resolve the native R2 binding, if this runtime provides one.
 * Returns `undefined` outside the Worker runtime so callers fall back to S3.
 */
async function nativeBucket(): Promise<NativeR2Bucket | undefined> {
  let workerModule: { env: unknown };
  try {
    workerModule = await import("cloudflare:workers");
  } catch {
    return undefined;
  }
  const environment = workerModule.env as {
    RADARSITE_MEDIA?: NativeR2Bucket;
    RADARSITE_R2_TRANSPORT?: string;
  };
  if (environment.RADARSITE_MEDIA) return environment.RADARSITE_MEDIA;
  if (environment.RADARSITE_R2_TRANSPORT === "native") {
    throw new Error("Native R2 binding RADARSITE_MEDIA is missing");
  }
  return undefined;
}

function createNativeAdapter(bucket: NativeR2Bucket, config: R2StorageConfig): StorageAdapter {
  return {
    provider: "r2",
    transport: "workers-binding",
    bucket: config.bucket,

    async check() {
      await bucket.list({ limit: 1 });
    },

    async put(key: string, body: Uint8Array | Buffer, options: StoragePutOptions): Promise<StorageObjectInfo> {
      const onlyIf = options.ifMatch
        ? { etagMatches: options.ifMatch }
        : options.ifNoneMatch
          ? { etagDoesNotMatch: options.ifNoneMatch }
          : undefined;
      const result = await bucket.put(key, body, {
        httpMetadata: { contentType: options.contentType, cacheControl: options.cacheControl },
        ...(options.metadata ? { customMetadata: options.metadata } : {}),
        ...(onlyIf ? { onlyIf } : {}),
      });
      if (!result) throw conditionalWriteError();
      return nativeInfo(result);
    },

    async head(key: string): Promise<StorageObjectInfo | null> {
      const result = await bucket.head(key);
      return result ? nativeInfo(result) : null;
    },

    async get(key: string): Promise<StorageObjectData | null> {
      const result = await bucket.get(key);
      if (!result) return null;
      return { ...nativeInfo(result), body: Buffer.from(await result.arrayBuffer()) };
    },

    async delete(key: string): Promise<void> {
      await bucket.delete(key);
    },

    async list(options: StorageListOptions = {}): Promise<StorageListResult> {
      const result = await bucket.list({
        limit: options.limit,
        prefix: options.prefix,
        cursor: options.cursor,
      });
      return {
        objects: (result.objects || []).map((item) => ({
          key: item.key,
          size: item.size,
          etag: etag(item.etag),
          lastModified: item.uploaded?.toISOString(),
        })),
        truncated: Boolean(result.truncated),
        cursor: result.cursor,
      };
    },

    publicUrl(key: string): string | undefined {
      return joinPublicUrl(config.publicBaseUrl, key);
    },
  };
}

/**
 * Build the R2 adapter, preferring the native binding when the runtime
 * provides one and falling back to the S3 API otherwise.
 */
export async function createR2Adapter(config: R2StorageConfig): Promise<StorageAdapter> {
  const native = await nativeBucket();
  if (native) return createNativeAdapter(native, config);

  return createS3Adapter({
    provider: "r2",
    bucket: config.bucket,
    endpoint: config.endpoint,
    // R2's S3 API expects region "auto".
    region: "auto",
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    publicBaseUrl: config.publicBaseUrl,
    // R2 requires virtual-hosted-style addressing.
    forcePathStyle: false,
  });
}

export { missingObject as r2MissingObject };
