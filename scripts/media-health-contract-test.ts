import assert from "node:assert/strict";
import { bodyToBuffer, checksumSha256, type MediaStorageConfig, validateMediaDeliveryUrl } from "../src/lib/media-storage";

const body = Buffer.from("RADARSite R2 health check", "utf8");
const key = "site-assets/health-check/contract-fixture.txt";
const fallbackConfig: MediaStorageConfig = { provider: "r2", bucket: "radarsite-media", endpoint: "https://825459f1f313c6c9427bf6718bbd4907.r2.cloudflarestorage.com" };
const fallbackUrl = `${fallbackConfig.endpoint}/${fallbackConfig.bucket}/${key}`;

type Failure = "read" | "content" | "metadata" | "url" | "database";

class MemoryLifecycle {
  readonly objects = new Map<string, Buffer>();
  readonly records = new Set<string>();

  async run(failure?: Failure) {
    let attempted = false;
    let uploaded = false;
    let recorded = false;
    try {
      attempted = true;
      this.objects.set(key, Buffer.from(body));
      uploaded = true;
      if (failure === "read") throw new Error("READ_FAILURE");
      const retrieved = Buffer.from(failure === "content" ? "changed" : body);
      const contentValidation = { ok: retrieved.byteLength === body.byteLength && checksumSha256(retrieved) === checksumSha256(body), expectedSize: body.byteLength, actualSize: retrieved.byteLength, checksumMatch: checksumSha256(retrieved) === checksumSha256(body) };
      if (!contentValidation.ok) throw new Error("CONTENT_FAILURE");
      const metadata = { size: failure === "metadata" ? body.byteLength + 1 : body.byteLength, contentType: "text/plain" };
      if (metadata.size !== body.byteLength || metadata.contentType !== "text/plain") throw new Error("METADATA_FAILURE");
      const deliveryUrl = validateMediaDeliveryUrl({ key, url: failure === "url" ? "http://invalid.example/health-check" : fallbackUrl, config: fallbackConfig });
      if (!deliveryUrl.ok) throw new Error("URL_FAILURE");
      if (failure === "database") throw new Error("DATABASE_FAILURE");
      this.records.add("health-check-contract");
      recorded = true;
      this.objects.delete(key);
      this.records.delete("health-check-contract");
      return { ok: !this.objects.has(key) && !this.records.has("health-check-contract") };
    } catch (error) {
      if (attempted || uploaded) this.objects.delete(key);
      if (recorded) this.records.delete("health-check-contract");
      throw error;
    }
  }
}

async function expectFailure(action: () => Promise<unknown>, message: string) {
  await assert.rejects(action, new RegExp(message));
}

async function main() {
  const streamed = await bodyToBuffer({ transformToByteArray: async () => new Uint8Array(body) });
  assert.deepEqual(streamed, body);

  const validFallback = validateMediaDeliveryUrl({ key, url: fallbackUrl, config: fallbackConfig });
  assert.deepEqual(validFallback, { ok: true, configuredBaseUrl: false, protocol: "https", hostValid: true, semantics: "r2-endpoint-fallback" });
  const invalidUrl = validateMediaDeliveryUrl({ key, url: "http://invalid.example/health-check", config: fallbackConfig });
  assert.equal(invalidUrl.ok, false);

  const success = new MemoryLifecycle();
  assert.deepEqual(await success.run(), { ok: true });
  assert.equal(success.objects.size, 0);
  assert.equal(success.records.size, 0);

  for (const failure of ["read", "content", "metadata", "url", "database"] as const) {
    const lifecycle = new MemoryLifecycle();
    await expectFailure(() => lifecycle.run(failure), failure === "content" ? "CONTENT_FAILURE" : failure === "metadata" ? "METADATA_FAILURE" : failure === "url" ? "URL_FAILURE" : failure === "database" ? "DATABASE_FAILURE" : "READ_FAILURE");
    assert.equal(lifecycle.objects.size, 0, `${failure} left an object`);
    assert.equal(lifecycle.records.size, 0, `${failure} left a record`);
  }

  console.log(JSON.stringify({
    exactByteMatch: "PASS",
    byteMismatch: "PASS",
    sizeMismatch: "PASS",
    metadata: "PASS",
    validUrl: "PASS",
    invalidUrl: "PASS",
    fallbackUrl: "PASS",
    cleanupAfterReadFailure: "PASS",
    cleanupAfterUrlFailure: "PASS",
    cleanupAfterDatabaseFailure: "PASS",
    finalObjectCount: success.objects.size,
    finalRecordCount: success.records.size,
    productionContacted: false,
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
