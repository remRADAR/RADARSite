/**
 * Shared S3-compatible adapter.
 *
 * Both Cloudflare R2 (via its S3 API) and Storj (via its S3-compatible
 * gateway) speak the same protocol, so the transport lives here once and the
 * provider modules only supply configuration.
 *
 * Uses `@aws-sdk/client-s3`, which is already a dependency and works in the
 * Cloudflare Worker runtime (fetch-based, no Node sockets required).
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import {
  joinPublicUrl,
  type StorageAdapter,
  type StorageListOptions,
  type StorageListResult,
  type StorageObjectData,
  type StorageObjectInfo,
  type StorageProvider,
  type StoragePutOptions,
  type StorageTransport,
} from "./types";

export type S3AdapterOptions = {
  provider: StorageProvider;
  bucket: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl?: string;
  /**
   * R2 requires virtual-hosted-style addressing (forcePathStyle: false).
   * Storj's gateway works with path-style, which is the safer default for
   * self-hosted S3 gateways.
   */
  forcePathStyle: boolean;
};

function stripQuotes(value?: string): string | undefined {
  return value?.replaceAll('"', "");
}

function missingObject(key: string, provider: StorageProvider) {
  const error = new Error(`${provider.toUpperCase()} object not found: ${key}`);
  Object.assign(error, {
    name: "NoSuchKey",
    Code: "NoSuchKey",
    code: "NoSuchKey",
    $metadata: { httpStatusCode: 404 },
  });
  return error;
}

function conditionalWriteError(provider: StorageProvider) {
  const error = new Error(`${provider.toUpperCase()} write precondition failed`);
  Object.assign(error, {
    name: "PreconditionFailed",
    Code: "PreconditionFailed",
    code: "PreconditionFailed",
    $metadata: { httpStatusCode: 412 },
  });
  return error;
}

async function bodyToBuffer(
  body: { transformToByteArray?: () => Promise<Uint8Array>; arrayBuffer?: () => Promise<ArrayBuffer> } | undefined,
): Promise<Buffer> {
  if (!body) throw new Error("Object body is unavailable");
  if (typeof body.transformToByteArray === "function") {
    return Buffer.from(await body.transformToByteArray());
  }
  if (typeof body.arrayBuffer === "function") {
    return Buffer.from(await body.arrayBuffer());
  }
  throw new Error("Object body is unavailable");
}

export function createS3Adapter(options: S3AdapterOptions): StorageAdapter {
  const client = new S3Client({
    region: options.region,
    endpoint: options.endpoint,
    forcePathStyle: options.forcePathStyle,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
  });

  const transport: StorageTransport = "s3-compatible";

  return {
    provider: options.provider,
    transport,
    bucket: options.bucket,

    async check() {
      await client.send(new HeadBucketCommand({ Bucket: options.bucket }));
    },

    async put(key: string, body: Uint8Array | Buffer, putOptions: StoragePutOptions): Promise<StorageObjectInfo> {
      const response = await client.send(
        new PutObjectCommand({
          Bucket: options.bucket,
          Key: key,
          Body: body,
          ContentType: putOptions.contentType,
          CacheControl: putOptions.cacheControl,
          Metadata: putOptions.metadata,
          ...(putOptions.ifMatch ? { IfMatch: putOptions.ifMatch } : {}),
          ...(putOptions.ifNoneMatch ? { IfNoneMatch: putOptions.ifNoneMatch } : {}),
        }),
      );
      return {
        key,
        size: body.byteLength,
        etag: stripQuotes(response.ETag),
        contentType: putOptions.contentType,
        metadata: putOptions.metadata || {},
      };
    },

    async head(key: string): Promise<StorageObjectInfo | null> {
      try {
        const response = await client.send(
          new HeadObjectCommand({ Bucket: options.bucket, Key: key }),
        );
        return {
          key,
          size: response.ContentLength || 0,
          etag: stripQuotes(response.ETag),
          contentType: response.ContentType || "application/octet-stream",
          checksum: response.ChecksumSHA256,
          metadata: response.Metadata || {},
        };
      } catch (error) {
        const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
        if (status === 404) return null;
        throw error;
      }
    },

    async get(key: string): Promise<StorageObjectData | null> {
      try {
        const response = await client.send(
          new GetObjectCommand({ Bucket: options.bucket, Key: key }),
        );
        if (!response.Body) throw missingObject(key, options.provider);
        return {
          key,
          body: await bodyToBuffer(
            response.Body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined,
          ),
          size: response.ContentLength || 0,
          etag: stripQuotes(response.ETag),
          contentType: response.ContentType || "application/octet-stream",
          checksum: response.ChecksumSHA256,
          metadata: response.Metadata || {},
        };
      } catch (error) {
        const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
        if (status === 404) return null;
        throw error;
      }
    },

    async delete(key: string): Promise<void> {
      await client.send(new DeleteObjectCommand({ Bucket: options.bucket, Key: key }));
    },

    async list(listOptions: StorageListOptions = {}): Promise<StorageListResult> {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: options.bucket,
          Prefix: listOptions.prefix,
          MaxKeys: listOptions.limit,
          ContinuationToken: listOptions.cursor,
        }),
      );
      return {
        objects: (response.Contents || []).map((item) => ({
          key: item.Key || "",
          size: item.Size || 0,
          etag: stripQuotes(item.ETag),
          lastModified: item.LastModified?.toISOString(),
        })),
        truncated: Boolean(response.IsTruncated),
        cursor: response.NextContinuationToken,
      };
    },

    publicUrl(key: string): string | undefined {
      return joinPublicUrl(options.publicBaseUrl, key);
    },
  };
}

export { conditionalWriteError, missingObject };
