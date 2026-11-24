/**
 * Storage provider selection and configuration.
 *
 * The provider is chosen by the `STORAGE_PROVIDER` environment variable:
 *
 *   STORAGE_PROVIDER unset / "r2"  -> Cloudflare R2 (current production behaviour)
 *   STORAGE_PROVIDER="storj"       -> Storj S3-compatible gateway
 *
 * R2 remains the default so that an environment with no `STORAGE_PROVIDER`
 * set behaves exactly as it did before this adapter existed.
 *
 * No credentials are ever hardcoded here; every value comes from the
 * environment. See docs/storage-adapter.md for the full variable list.
 */

import type { StorageProvider } from "./types";

export type R2StorageConfig = {
  provider: "r2";
  bucket: string;
  endpoint: string;
  publicBaseUrl?: string;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export type StorjStorageConfig = {
  provider: "storj";
  bucket: string;
  endpoint: string;
  region: string;
  publicBaseUrl?: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export type StorageConfig = R2StorageConfig | StorjStorageConfig;

const SUPPORTED_PROVIDERS: readonly StorageProvider[] = ["r2", "storj"];

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function required(name: string): string {
  const value = read(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function stripTrailingSlash(value: string | undefined): string | undefined {
  return value ? value.replace(/\/+$/, "") : undefined;
}

/**
 * Resolve the configured provider. Unknown values fail loudly rather than
 * silently falling back, so a typo cannot quietly point production at the
 * wrong bucket.
 */
export function storageProvider(): StorageProvider {
  const raw = read("STORAGE_PROVIDER")?.toLowerCase();
  if (!raw) return "r2";
  if (!SUPPORTED_PROVIDERS.includes(raw as StorageProvider)) {
    throw new Error(
      `STORAGE_PROVIDER must be one of ${SUPPORTED_PROVIDERS.join(", ")} (received "${raw}")`,
    );
  }
  return raw as StorageProvider;
}

export function r2StorageConfig(): R2StorageConfig {
  const accountId = required("R2_ACCOUNT_ID");
  return {
    provider: "r2",
    accountId,
    bucket: required("R2_BUCKET"),
    endpoint: read("R2_ENDPOINT") || `https://${accountId}.r2.cloudflarestorage.com`,
    publicBaseUrl: stripTrailingSlash(read("R2_PUBLIC_BASE_URL")),
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
  };
}

export function storjStorageConfig(): StorjStorageConfig {
  return {
    provider: "storj",
    bucket: required("STORJ_BUCKET"),
    endpoint: required("STORJ_ENDPOINT"),
    region: read("STORJ_REGION") || "us-east-1",
    publicBaseUrl: stripTrailingSlash(read("STORJ_PUBLIC_BASE_URL")),
    accessKeyId: required("STORJ_ACCESS_KEY_ID"),
    secretAccessKey: required("STORJ_SECRET_ACCESS_KEY"),
  };
}

/** Resolve the full configuration for the selected provider. */
export function storageConfig(): StorageConfig {
  return storageProvider() === "storj" ? storjStorageConfig() : r2StorageConfig();
}

/**
 * Non-throwing description of what is configured, for diagnostics endpoints.
 * Never includes secret values.
 */
export function storageDiagnostics() {
  const provider = storageProvider();
  if (provider === "storj") {
    const endpoint = read("STORJ_ENDPOINT") || "";
    let endpointValid = false;
    try {
      const parsed = new URL(endpoint);
      endpointValid = parsed.protocol === "https:" && !parsed.username && !parsed.password;
    } catch {
      endpointValid = false;
    }
    return {
      provider,
      bucket: read("STORJ_BUCKET") || "",
      endpoint,
      region: read("STORJ_REGION") || "us-east-1",
      credentialsPresent: Boolean(read("STORJ_ACCESS_KEY_ID") && read("STORJ_SECRET_ACCESS_KEY")),
      endpointFormatValid: endpointValid,
      publicBaseUrlConfigured: Boolean(read("STORJ_PUBLIC_BASE_URL")),
    };
  }

  const accountId = read("R2_ACCOUNT_ID") || "";
  const bucket = read("R2_BUCKET") || "";
  const endpoint = read("R2_ENDPOINT") || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  let parsed: URL | undefined;
  try {
    parsed = endpoint ? new URL(endpoint) : undefined;
  } catch {
    parsed = undefined;
  }
  const expectedEndpoint = accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "";
  return {
    provider,
    accountId,
    bucket,
    endpoint,
    endpointSource: read("R2_ENDPOINT") ? "explicit" : "derived",
    accountIdFormatValid: /^[a-f0-9]{32}$/.test(accountId),
    bucketMatchesTarget: bucket === "radarsite-media",
    credentialsPresent: Boolean(read("R2_ACCESS_KEY_ID") && read("R2_SECRET_ACCESS_KEY")),
    endpointFormatValid: Boolean(
      parsed &&
        parsed.protocol === "https:" &&
        parsed.hostname === `${accountId}.r2.cloudflarestorage.com` &&
        parsed.pathname === "/" &&
        !parsed.search &&
        !parsed.hash &&
        !parsed.username &&
        !parsed.password &&
        !parsed.port,
    ),
    endpointMatchesDerivedAccount: endpoint === expectedEndpoint,
  };
}
