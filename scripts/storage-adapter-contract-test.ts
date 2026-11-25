/**
 * Storage adapter contract test.
 *
 * Static checks only — no network, no real bucket. Verifies provider
 * selection, config resolution, error behaviour and the adapter interface.
 *
 * Run: npx tsx scripts/storage-adapter-contract-test.ts
 */

import assert from "node:assert/strict";

import {
  storageProvider,
  storageConfig,
  storjStorageConfig,
  storageDiagnostics,
} from "../src/lib/storage/config";
import { createStorjAdapter } from "../src/lib/storage/storj";

const R2_ENV: Record<string, string> = {
  R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
  R2_BUCKET: "radarsite-media",
  R2_ACCESS_KEY_ID: "r2-access-key",
  R2_SECRET_ACCESS_KEY: "r2-secret-key",
};

const STORJ_ENV: Record<string, string> = {
  STORJ_ENDPOINT: "https://gateway.storjshare.io",
  STORJ_BUCKET: "radarsite-media",
  STORJ_ACCESS_KEY_ID: "storj-access-key",
  STORJ_SECRET_ACCESS_KEY: "storj-secret-key",
  STORJ_REGION: "eu-1",
  STORJ_PUBLIC_BASE_URL: "https://cdn.example.test",
};

const MANAGED = [
  "STORAGE_PROVIDER",
  ...Object.keys(R2_ENV),
  ...Object.keys(STORJ_ENV),
];

function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const saved = MANAGED.map((name) => [name, process.env[name]] as const);
  for (const name of MANAGED) delete process.env[name];
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

/** Returns a copy of `env` with the named keys removed. */
function without(env: Record<string, string>, ...keys: string[]): Record<string, string> {
  const copy = { ...env };
  for (const key of keys) delete copy[key];
  return copy;
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
  });
});

// 2. Explicit r2 matches the default exactly.
check("explicit STORAGE_PROVIDER=r2 matches the default", () => {
  const implicit = withEnv(R2_ENV, () => storageConfig());
  const explicit = withEnv({ ...R2_ENV, STORAGE_PROVIDER: "r2" }, () => storageConfig());
  assert.deepEqual(explicit, implicit);
});

// 3. Storj selection.
check("STORAGE_PROVIDER=storj selects the Storj backend", () => {
  withEnv({ ...STORJ_ENV, STORAGE_PROVIDER: "storj" }, () => {
    assert.equal(storageProvider(), "storj");
    const config = storageConfig();
    assert.equal(config.provider, "storj");
    assert.equal(config.bucket, "radarsite-media");
    assert.equal(config.endpoint, "https://gateway.storjshare.io");
  });
});

// 4. Storj does not require any R2 variable.
check("storj does not require any R2 variable", () => {
  withEnv({ ...STORJ_ENV, STORAGE_PROVIDER: "storj" }, () => {
    assert.equal(storageConfig().provider, "storj");
  });
});

// 5. Region defaults when unset.
check("storj region defaults to us-east-1", () => {
  const withoutRegion = without(STORJ_ENV, "STORJ_REGION");
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

// 7. Missing variables are named.
check("missing storj variables are reported by name", () => {
  withEnv({ STORAGE_PROVIDER: "storj" }, () => {
    assert.throws(() => storjStorageConfig(), /STORJ_ENDPOINT/);
  });
});

// 8. Diagnostics never leak secrets.
check("diagnostics never include secret values", () => {
  withEnv({ ...STORJ_ENV, STORAGE_PROVIDER: "storj" }, () => {
    const serialised = JSON.stringify(storageDiagnostics());
    assert.equal(serialised.includes("storj-secret-key"), false);
    assert.equal(serialised.includes("storj-access-key"), false);
  });
});

// 9. Public URL joining is consistent.
check("public URL helper joins base and key identically", () => {
  withEnv({ ...STORJ_ENV, STORAGE_PROVIDER: "storj" }, () => {
    const adapter = createStorjAdapter(storjStorageConfig());
    assert.equal(adapter.publicUrl("site-assets/x.webp"), "https://cdn.example.test/site-assets/x.webp");
  });
});

// 10. Interface completeness.
check("storj adapter exposes the full interface", () => {
  withEnv({ ...STORJ_ENV, STORAGE_PROVIDER: "storj" }, () => {
    const adapter = createStorjAdapter(storjStorageConfig());
    for (const method of ["check", "put", "get", "head", "delete", "list", "publicUrl"] as const) {
      assert.equal(typeof adapter[method], "function", `missing ${method}`);
    }
    assert.equal(adapter.provider, "storj");
  });
});

// 11. No public base URL means no invented URL.
check("adapter returns undefined when no public base URL is set", () => {
  const withoutPublic = without(STORJ_ENV, "STORJ_PUBLIC_BASE_URL");
  withEnv({ ...withoutPublic, STORAGE_PROVIDER: "storj" }, () => {
    const adapter = createStorjAdapter(storjStorageConfig());
    assert.equal(adapter.publicUrl("site-assets/x.webp"), undefined);
  });
});

console.log(`storage-adapter contract test: ${results.length} checks passed`);
for (const name of results) console.log(`  ok  ${name}`);
