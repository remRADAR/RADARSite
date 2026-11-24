/**
 * Provider-agnostic object storage contract.
 *
 * Every backend (Cloudflare R2, Storj S3 gateway, ...) implements this
 * interface so callers never branch on the provider. The provider is chosen
 * by configuration (`STORAGE_PROVIDER`), not by code changes.
 *
 * This module is intentionally dependency-free so it can be imported from the
 * Cloudflare Worker runtime, Node scripts and tests alike.
 */

export type StorageProvider = "r2" | "storj";

/** How the adapter reaches the bucket. */
export type StorageTransport = "workers-binding" | "s3-compatible";

export type StorageObjectInfo = {
  key: string;
  size: number;
  etag?: string;
  contentType: string;
  checksum?: string;
  metadata: Record<string, string>;
};

export type StorageObjectData = StorageObjectInfo & { body: Buffer };

export type StorageListEntry = {
  key: string;
  size: number;
  etag?: string;
  lastModified?: string;
};

export type StorageListResult = {
  objects: StorageListEntry[];
  truncated: boolean;
  cursor?: string;
};

export type StorageListOptions = {
  prefix?: string;
  limit?: number;
  cursor?: string;
};

export type StoragePutOptions = {
  contentType: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
  /** Conditional write: only succeed if the stored ETag matches. */
  ifMatch?: string;
  /** Conditional write: only succeed if no object exists at the key. */
  ifNoneMatch?: string;
};

export interface StorageAdapter {
  readonly provider: StorageProvider;
  readonly transport: StorageTransport;
  readonly bucket: string;
  /** Cheap reachability probe; throws when the bucket is not usable. */
  check(): Promise<void>;
  put(key: string, body: Uint8Array | Buffer, options: StoragePutOptions): Promise<StorageObjectInfo>;
  get(key: string): Promise<StorageObjectData | null>;
  head(key: string): Promise<StorageObjectInfo | null>;
  delete(key: string): Promise<void>;
  list(options?: StorageListOptions): Promise<StorageListResult>;
  /**
   * Public delivery URL for a key, or `undefined` when the provider has no
   * public base URL configured. Never invents a URL.
   */
  publicUrl(key: string): string | undefined;
}

/** Encode each path segment but keep the separators. */
export function encodeStorageKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

/** Join a public base URL and a key into a delivery URL. */
export function joinPublicUrl(baseUrl: string | undefined, key: string): string | undefined {
  if (!baseUrl) return undefined;
  return `${baseUrl.replace(/\/$/, "")}/${encodeStorageKey(key)}`;
}
