import assert from "node:assert/strict";
import {
  normalizePublicMediaOrigin,
  publicImageOrigins,
  publicImageRemotePattern,
  staticPublicImageOrigins,
} from "@/lib/public-media-origin";

const r2Origin = "https://pub-example.r2.dev";
const origins = publicImageOrigins(`${r2Origin}/`);

assert.equal(normalizePublicMediaOrigin(`${r2Origin}/`), r2Origin);
assert.equal(normalizePublicMediaOrigin(undefined), undefined);
assert.equal(normalizePublicMediaOrigin(""), undefined);
assert.deepEqual(origins.slice(0, staticPublicImageOrigins.length), staticPublicImageOrigins);
assert.equal(origins.filter((origin) => origin === r2Origin).length, 1);
assert.equal(origins.some((origin) => origin.includes("*.r2.dev")), false);
assert.equal(origins.some((origin) => origin.includes("r2.cloudflarestorage.com")), false);

const pattern = publicImageRemotePattern(r2Origin);
assert.deepEqual(pattern, { protocol: "https", hostname: "pub-example.r2.dev" });

for (const invalid of [
  "http://pub-example.r2.dev",
  "https://user:pass@pub-example.r2.dev",
  "https://pub-example.r2.dev/path",
  "https://pub-example.r2.dev/?token=secret",
  "not-a-url",
]) {
  assert.throws(() => normalizePublicMediaOrigin(invalid), /R2_PUBLIC_BASE_URL/);
}

console.log({
  validation: "PASS",
  staticOrigins: staticPublicImageOrigins.length,
  configuredR2Origin: r2Origin,
  wildcardRejected: true,
  privateEndpointRejected: true,
  malformedRejected: true,
});
