import assert from "node:assert/strict";
import { classifyDatabaseError, resolveNeonConnection } from "@/lib/database";

// The production write path failed with Cloudflare 1016 / HTTP 530 because the
// Neon HTTP driver derives its query endpoint by replacing the first host label
// with "api.". These assertions pin the resolution rules that prevent it.

// 1. A standard direct Neon host is normalized to the pooled host, and the
//    derived endpoint is the region-level api host (never the ep- host).
const direct = resolveNeonConnection(
  "postgresql://user:pass@ep-cool-name-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require",
);
assert.equal(direct.host, "ep-cool-name-123456-pooler.eu-central-1.aws.neon.tech");
assert.equal(direct.endpoint, "https://api.eu-central-1.aws.neon.tech");
assert.equal(direct.pooled, true);
assert.ok(direct.warnings.some((w) => /not pooled/.test(w)));

// 2. An already-pooled host is left alone and derives the same endpoint.
const pooled = resolveNeonConnection(
  "postgresql://user:pass@ep-cool-name-123456-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require",
);
assert.equal(pooled.host, "ep-cool-name-123456-pooler.eu-central-1.aws.neon.tech");
assert.equal(pooled.endpoint, "https://api.eu-central-1.aws.neon.tech");
assert.equal(pooled.warnings.length, 0);

// 3. A custom / non-Neon host is rejected with an actionable message instead of
//    silently deriving a nonexistent "api." host (the 1016 cause).
assert.throws(
  () => resolveNeonConnection("postgresql://user:pass@db.radarcharts.net:5432/neondb"),
  /not a Neon endpoint host[\s\S]*1016/,
);

// 4. An explicit endpoint override is honoured for a custom host.
process.env.NEON_HTTP_ENDPOINT = "https://api.eu-central-1.aws.neon.tech";
try {
  const overridden = resolveNeonConnection("postgresql://user:pass@db.radarcharts.net:5432/neondb");
  assert.equal(overridden.endpoint, "https://api.eu-central-1.aws.neon.tech");
} finally {
  delete process.env.NEON_HTTP_ENDPOINT;
}

// 5. Error classification: a DNS/endpoint failure must NOT be treated as transient
//    (retrying it cannot succeed), while a genuine 5xx is retryable.
assert.equal(classifyDatabaseError("Server error (HTTP status 530): error code: 1016"), "dns-endpoint");
assert.equal(classifyDatabaseError("getaddrinfo ENOTFOUND api.example.com"), "dns-endpoint");
assert.equal(classifyDatabaseError("Server error (HTTP status 402): quota exceeded"), "quota");
assert.equal(classifyDatabaseError("Server error (HTTP status 503): upstream"), "transient");
assert.equal(classifyDatabaseError("fetch failed"), "transient");
assert.equal(classifyDatabaseError("something else"), "unknown");

console.log("Neon connection-path contract passed: pooled normalization, endpoint derivation, custom-host rejection, override, and error classification are valid.");
