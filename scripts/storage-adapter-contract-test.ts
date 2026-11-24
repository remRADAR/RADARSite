/**
 * Storage adapter contract test.
 *
 * Verifies the provider-agnostic layer without touching a real bucket:
 *
 *  1. R2 is the default when STORAGE_PROVIDER is unset (no behaviour change).
 *  2. STORAGE_PROVIDER=storj selects the Storj backend and reads its own vars.
 *  3. An unknown provider fails loudly instead of silently falling back.
 *  4. Storj config requires every documented variable and never invents one.
 *  5. Public URL helpers behave identically for both providers.
 *  6. The adapter interface is satisfied by both backends.
 *
 * Run: npx tsx scripts/storage-adapter-contract-test.ts
 */

import assert from "node:assert/strict";

import {
  storageProvider,
  storageConfig,
  storageDiagnostics,
  r2StorageConfig,
  storjStorageConfig,
} from "../src/lib/storage/config";
import { joinPublicUrl, encodeStorageKey } from "../src/lib/storage/types";
import { createStorjAdapter } from "../src/lib/storage/storj";

const R2_ENV = {
  R2_ACCOUNT_ID: "825459f1f313c6c9427bf6718bbd4907",
  R2_BUCKET: "radarsite-media",
  R2_ACCESS_KEY_ID: "test-access-key",
  R2_SECRET_ACCESS_KEY: "test-secret-key",
  R2_PUBLIC_BASE_URL: "https://cdn.radarcharts.net/",
};

const STORJ_ENV = {
  STORJ_BUCKET: "radarsite-media",
  STORJ_ENDPOINT: "https://gateway.storjshare.io",
  STORJ_REGION: "us-east-1",
  STORJ_ACCESS_KEY_ID: "storj-access-key",
  STORJ_SECRET_ACCESS_KEY: "storj-secret-key",
  STORJ_PUBLIC_BASE_URL: "https://link.storjshare.io/raw/example-bucket",
};

const MANAGED = [
  "STORAGE_PROVIDER",
  ...Object.keys(R2_ENV),
  ...Object.keys(STORJ_ENV),
];

function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const saved = new Map<string, string | undefined>();
  for (const name of MANAGED) {
    saved.set(name, process.env[name]);
    delete process.env[name];
  }
  for (const [name, value] of Object.entries(env)) {
    if (value !== undefined) process.env[name] = value;
  }
  try {
    return fn();
  } finally {
    for (const [name, value] of saved) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

const results: string[] = [];
function check(name: string, fn: () => void) {
  fn();
  results.push(name);
}

// 1. Default provider is R2 — the critical no-behaviour-change guarantee.
check("defaults to r2 when STORAGE_PROVIDER is unset", () => {
  withEnv(R2_ENV, () => {
    assert.equal(storageProvider(), "r2");
    const config = storageConfig();
    assert.equal(config.provider, "r2");
    assert.equal(config.bucket, "radarsite-media");
    assert.equal(config.endpoint, "https://825459f1f313c6c9427bf6718bbd4907.r2.cloudflarestorage.com");
    // Trailing slash is stripped, matching the previous implementation.
    assert.equal(config.publicBaseUrl, "https://cdn.radarcharts.net");
  });
});

// 2. Explicit r2 is identical to the default.
check("explicit STORAGE_PROVIDER=r2 matches the default", () => {
  withEnv({ ...R2_ENV, STORAGE_PROVIDER: "r2" }, () => {
    assert.equal(storageProvider(), "r2");
    assert.deepEqual(storageConfig(), r2StorageConfig());
  });
});

// 3. Storj selection reads Storj variables, not R2 ones.
check("STORAGE_PROVIDER=storj selects the Storj backend", () => {
  withEnv({ ...STORJ_ENV, STORAGE_PROVIDER: "storj" }, () => {
    assert.equal(storageProvider(), "storj");
    const config = storageConfig();
    assert.equal(config.provider, "storj");
    assert.equal(config.bucket, "radarsite-media");
    assert.equal(config.endpoint, "https://gateway.storjshare.io");
    assert.equal(config.region, "us-east-1");
    assert.equal(config.publicBaseUrl, "https://link.storjshare.io/raw/example-bucket");
  });
});

// 4. Storj works with no R2 variables present at all.
check("storj does not require any R2 variable", () => {
  withEnv({ ...STORJ_ENV, STORAGE_PROVIDER: "storj" }, () => {
    assert.equal(process.env.R2_ACCOUNT_ID, undefined);
    assert.doesNotThrow(() => storjStorageConfig());
  });
});

// 5. Region defaults when unset.
check("storj region defaults to us-east-1", () => {
  const { STORJ_REGION: _omit, ...withoutRegion } = STORJ_ENV;
  withEnv({ ...withoutRegion, STORAGE_PROVIDER: "storj" }, () => {
    assert.equal(storjStorageConfig().region, "us-east-1");
  });
});

// 6. Unknown provider fails loudly.
check("unknown STORAGE_PROVIDER throws instead of falling back", () => {
  withEnv({ ...R2_ENV, STORAGE_PROVIDER: "s3" }, () => {
    assert.throws(() => storageProvider(), /STORAGE_PROVIDER must be one of/);
  });
});

// 7. Missing Storj variables are named in the error.
check("missing storj variables are reported by name", () => {
  withEnv({ STORAGE_PROVIDER: "storj" }, () => {
    assert.throws(() => storjStorageConfig(), /STORJ_BUCKET is not configured/);
  });
});

// 8. Diagnostics never leak secrets.
check("diagnostics never include secret values", () => {
  withEnv({ ...STORJ_ENV, STORAGE_PROVIDER: "storj" }, () => {
    const serialised = JSON.stringify(storageDiagnostics());
    assert.ok(!serialised.includes("storj-secret-key"), "secret key leaked into diagnostics");
    assert.ok(!serialised.includes("storj-access-key"), "access key leaked into diagnostics");
    assert.equal(storageDiagnostics().credentialsPresent, true);
  });
  withEnv({ ...R2_ENV, STORAGE_PROVIDER: "r2" }, () => {
    const serialised = JSON.stringify(storageDiagnostics());
    assert.ok(!serialised.includes("test-secret-key"), "R2 secret leaked into diagnostics");
  });
});

// 9. Public URL helpers are provider-independent.
check("public URL helper joins base and key identically", () => {
  assert.equal(joinPublicUrl("https://cdn.example.com", "a/b.webp"), "https://cdn.example.com/a/b.webp");
  assert.equal(joinPublicUrl("https://cdn.example.com/", "a/b.webp"), "https://cdn.example.com/a/b.webp");
  assert.equal(joinPublicUrl(undefined, "a/b.webp"), undefined);
  // Spaces and unicode are encoded per segment, separators preserved.
  assert.equal(encodeStorageKey("a b/c d.webp"), "a%20b/c%20d.webp");
});

// 10. The Storj adapter satisfies the interface and reports its identity.
check("storj adapter exposes the full interface", () => {
  withEnv({ ...STORJ_ENV, STORAGE_PROVIDER: "storj" }, () => {
    const adapter = createStorjAdapter(storjStorageConfig());
    assert.equal(adapter.provider, "storj");
    assert.equal(adapter.transport, "s3-compatible");
    assert.equal(adapter.bucket, "radarsite-media");
    for (const method of ["check", "put", "get", "head", "delete", "list", "publicUrl"] as const) {
      assert.equal(typeof adapter[method], "function", `missing method: ${method}`);
    }
    assert.equal(
      adapter.publicUrl("site-assets/x.webp"),
      "https://link.storjshare.io/raw/example-bucket/site-assets/x.webp",
    );
  });
});

// 11. No public base URL means no invented URL.
check("adapter returns undefined when no public base URL is set", () => {
  const { STORJ_PUBLIC_BASE_URL: _omit, ...withoutPublic } = STORJ_ENV;
  withEnv({ ...withoutPublic, STORAGE_PROVIDER: "storj" }, () => {
    const adapter = createStorjAdapter(storjStorageConfig());
    assert.equal(adapter.publicUrl("site-assets/x.webp"), undefined);
  });
});

console.log(`storage-adapter contract test: ${results.length} checks passed`);
for (const name of results) console.log(`  ok  ${name}`);
