/**
 * Storage adapter factory.
 *
 * Callers ask for "the storage adapter" and get whichever provider the
 * environment selects. No caller branches on the provider.
 *
 *   import { getStorageAdapter } from "@/lib/storage";
 *   const storage = await getStorageAdapter();
 *   await storage.put("site-assets/x.webp", bytes, { contentType: "image/webp" });
 *
 * The adapter is cached per provider so repeated calls in one request do not
 * rebuild the S3 client.
 */

import { storageConfig, storageDiagnostics, storageProvider } from "./config";
import { createR2Adapter } from "./r2";
import { createStorjAdapter } from "./storj";
import type { StorageAdapter, StorageProvider } from "./types";

export * from "./types";
export { storageConfig, storageDiagnostics, storageProvider } from "./config";
export type { R2StorageConfig, StorageConfig, StorjStorageConfig } from "./config";

const cache = new Map<StorageProvider, Promise<StorageAdapter>>();

/**
 * Resolve the configured storage adapter.
 *
 * Provider selection is by `STORAGE_PROVIDER`; R2 is the default so existing
 * deployments keep their current behaviour with no configuration change.
 */
export function getStorageAdapter(): Promise<StorageAdapter> {
  const provider = storageProvider();
  const existing = cache.get(provider);
  if (existing) return existing;

  const created =
    provider === "storj"
      ? Promise.resolve(createStorjAdapter(storageConfig() as Parameters<typeof createStorjAdapter>[0]))
      : createR2Adapter(storageConfig() as Parameters<typeof createR2Adapter>[0]);

  cache.set(provider, created);
  // A failed construction must not be cached, or one bad config poisons the
  // process for every later request.
  created.catch(() => cache.delete(provider));
  return created;
}

/** Drop the cached adapter. Used by tests and after a config change. */
export function resetStorageAdapter(): void {
  cache.clear();
}

/**
 * Reachability probe for health endpoints. Returns a description of the
 * active provider without ever exposing credentials.
 */
export async function checkStorage() {
  const diagnostics = storageDiagnostics();
  const storage = await getStorageAdapter();
  await storage.check();
  return {
    provider: storage.provider,
    transport: storage.transport,
    bucket: storage.bucket,
    publicBaseUrlConfigured: Boolean(storage.publicUrl("probe")),
    diagnostics,
  };
}
