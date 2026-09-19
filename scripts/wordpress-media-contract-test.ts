import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dryRunObjectKey, mediaIdentity, migrateSyntheticAttachment, type DryRunMediaRepository, type DryRunMediaStorage, type SyntheticWordPressAttachment } from "../src/lib/wordpress-media-dry-run";
import { validateMediaDeliveryUrl, type StoredMedia } from "../src/lib/media-storage";
import { createAttachmentFromVerifiedManifest, VERIFIED_LEGACY_ASSET, type VerifiedWordPressAssetManifest } from "../src/lib/verified-wordpress-asset";
import type { ContentMediaRecord } from "../src/lib/content-server";

const STORAGE_CONFIG = { provider: "r2" as const, bucket: "synthetic-dry-run", endpoint: "https://r2.example.test" };

class MemoryStorage implements DryRunMediaStorage {
  readonly objects = new Map<string, { body: Buffer; contentType: string; url: string; metadata: Record<string, string> }>();
  failValidation = false;
  corruptReads = false;
  wrongHead = false;

  async put(input: { key: string; body: Buffer; contentType: string; metadata?: Record<string, string> }): Promise<StoredMedia> {
    if (this.objects.has(input.key)) throw new Error(`OBJECT_ALREADY_EXISTS:${input.key}`);
    const value = { body: Buffer.from(input.body), contentType: input.contentType, url: `${STORAGE_CONFIG.endpoint}/${STORAGE_CONFIG.bucket}/${input.key}`, metadata: input.metadata || {} };
    this.objects.set(input.key, value);
    return { key: input.key, url: value.url, provider: "r2", bucket: STORAGE_CONFIG.bucket, contentType: value.contentType, size: value.body.byteLength, etag: createHash("md5").update(value.body).digest("hex") };
  }
  async head(key: string) {
    const object = this.objects.get(key);
    if (!object) throw new Error(`NOT_FOUND:${key}`);
    return { key, url: object.url, contentType: this.wrongHead ? "application/octet-stream" : object.contentType, size: object.body.byteLength, metadata: object.metadata };
  }
  async get(key: string) {
    const object = this.objects.get(key);
    if (!object) throw new Error(`NOT_FOUND:${key}`);
    return this.corruptReads ? Buffer.from("same-size-but-different-bytes") : Buffer.from(object.body);
  }
  async delete(key: string) { this.objects.delete(key); }
  validateDeliveryUrl(input: { key: string; url: string }) {
    if (this.failValidation) return validateMediaDeliveryUrl({ key: input.key, url: "not-a-url", config: STORAGE_CONFIG });
    return validateMediaDeliveryUrl({ key: input.key, url: input.url, config: STORAGE_CONFIG });
  }
}

class PutThenThrowStorage extends MemoryStorage {
  async put(input: { key: string; body: Buffer; contentType: string; metadata?: Record<string, string> }): Promise<StoredMedia> {
    await super.put(input);
    throw new Error("PUT_FAILED_AFTER_REMOTE_SIDE_EFFECT");
  }
}

class PersistenceFailureRepository implements DryRunMediaRepository {
  readonly records = new Map<string, ContentMediaRecord>();
  async findByIdentity(identity: string) { return [...this.records.values()].find((record) => record.provenance?.mediaIdentity === identity); }
  async upsert(record: ContentMediaRecord) { this.records.set(record.id, record); throw new Error("PERSISTENCE_FAILED_AFTER_WRITE"); }
  async delete(id: string) { this.records.delete(id); }
}

class MemoryRepository implements DryRunMediaRepository {
  readonly records = new Map<string, ContentMediaRecord>();
  async findByIdentity(identity: string) { return [...this.records.values()].find((record) => record.provenance?.mediaIdentity === identity); }
  async upsert(record: ContentMediaRecord) { this.records.set(record.id, record); }
  async delete(id: string) { this.records.delete(id); }
}

const sourceBytes = Buffer.from("synthetic-wordpress-image-bytes", "utf8");
const fixtureManifest: VerifiedWordPressAssetManifest = {
  ...VERIFIED_LEGACY_ASSET,
  attachmentId: "123",
  sourceUrl: "https://remradar.wordpress.com/wp-content/uploads/2020/01/synthetic-image.png",
  originalFilename: "synthetic-image.png",
  mimeType: "image/png",
  width: 640,
  height: 360,
  byteSize: sourceBytes.byteLength,
  sha256: createHash("sha256").update(sourceBytes).digest("hex"),
};
const fixture: SyntheticWordPressAttachment = createAttachmentFromVerifiedManifest(fixtureManifest, sourceBytes);
const runId = "mother-base-fixture-001";
const expectedIdentity = "media:legacy:123";
const expectedKey = "site-assets/wordpress-dry-run/mother-base-fixture-001/legacy/attachments/123/original.png";

async function expectRejected(action: () => Promise<unknown>, message: string) {
  await assert.rejects(action, new RegExp(message));
}

function assertFallbackUrlCases() {
  const valid = validateMediaDeliveryUrl({ key: "site-assets/x.jpg", url: "https://r2.example.test/synthetic-dry-run/site-assets/x.jpg", config: STORAGE_CONFIG });
  assert.deepEqual(valid, { ok: true, configuredBaseUrl: false, protocol: "https", hostValid: true, semantics: "r2-endpoint-fallback" });
  assert.equal(validateMediaDeliveryUrl({ key: "site-assets/x.jpg", url: "not-a-url", config: STORAGE_CONFIG }).ok, false);
  assert.equal(validateMediaDeliveryUrl({ key: "site-assets/x.jpg", url: "http://r2.example.test/synthetic-dry-run/site-assets/x.jpg", config: STORAGE_CONFIG }).ok, false);
  assert.equal(validateMediaDeliveryUrl({ key: "site-assets/x.jpg", url: "https://wrong.example.test/synthetic-dry-run/site-assets/x.jpg", config: STORAGE_CONFIG }).ok, false);
}

async function main() {
  assertFallbackUrlCases();
  assert.equal(mediaIdentity(fixture), expectedIdentity);
  assert.equal(dryRunObjectKey({ ...fixture, runId }), expectedKey);
  assert.equal(VERIFIED_LEGACY_ASSET.provider, "legacy");
  assert.equal(VERIFIED_LEGACY_ASSET.attachmentId, "4757");
  assert.equal(VERIFIED_LEGACY_ASSET.mimeType, "image/jpeg");
  assert.deepEqual([VERIFIED_LEGACY_ASSET.width, VERIFIED_LEGACY_ASSET.height], [3810, 2143]);
  assert.equal(VERIFIED_LEGACY_ASSET.byteSize, 3_809_777);
  assert.equal(VERIFIED_LEGACY_ASSET.sha256, "b0d64f521328f53e48322881c3740881bf7ef5db7f804b3d3eeeccbf4f1c8604");
  await expectRejected(async () => createAttachmentFromVerifiedManifest(VERIFIED_LEGACY_ASSET, sourceBytes), "VERIFIED_ASSET_SIZE_MISMATCH");

  const storage = new MemoryStorage();
  const repository = new MemoryRepository();
  const first = await migrateSyntheticAttachment({ attachment: fixture, runId, storage, repository });
  assert.equal(first.uploaded, true);
  assert.equal(first.reused, false);
  assert.equal(first.deliveryUrlValidation.semantics, "r2-endpoint-fallback");
  assert.equal(first.contentMedia.sourceId, "123");
  assert.equal(first.contentMedia.checksum, createHash("sha256").update(sourceBytes).digest("hex"));

  const second = await migrateSyntheticAttachment({ attachment: fixture, runId, storage, repository });
  assert.equal(second.reused, true);
  assert.equal(second.uploaded, false);
  assert.equal(second.mediaId, first.mediaId);

  const sameSizeDifferentBytes = Buffer.alloc(sourceBytes.byteLength, 0x78);
  await expectRejected(() => migrateSyntheticAttachment({ attachment: { ...fixture, sourceBytes: sameSizeDifferentBytes }, runId, storage, repository }), "MEDIA_CHECKSUM_CONFLICT");
  await expectRejected(() => migrateSyntheticAttachment({ attachment: { ...fixture, sourceBytes: Buffer.from("changed-source-bytes", "utf8") }, runId, storage, repository }), "MEDIA_CHECKSUM_CONFLICT");

  await storage.delete(first.key);
  await expectRejected(() => migrateSyntheticAttachment({ attachment: fixture, runId, storage, repository }), "NOT_FOUND");
  await repository.delete(first.mediaId);

  const invalidUrlStorage = new MemoryStorage();
  invalidUrlStorage.failValidation = true;
  await expectRejected(() => migrateSyntheticAttachment({ attachment: fixture, runId: "failure-url", storage: invalidUrlStorage, repository: new MemoryRepository() }), "MEDIA_DELIVERY_URL_INVALID");
  assert.equal(invalidUrlStorage.objects.size, 0);

  const corruptStorage = new MemoryStorage();
  corruptStorage.corruptReads = true;
  await expectRejected(() => migrateSyntheticAttachment({ attachment: fixture, runId: "failure-bytes", storage: corruptStorage, repository: new MemoryRepository() }), "MEDIA_BYTE_VERIFICATION_FAILED");
  assert.equal(corruptStorage.objects.size, 0);

  const metadataStorage = new MemoryStorage();
  metadataStorage.wrongHead = true;
  await expectRejected(() => migrateSyntheticAttachment({ attachment: fixture, runId: "failure-head", storage: metadataStorage, repository: new MemoryRepository() }), "MEDIA_UPLOAD_VERIFICATION_FAILED");
  assert.equal(metadataStorage.objects.size, 0);

  const putFailureStorage = new PutThenThrowStorage();
  await expectRejected(() => migrateSyntheticAttachment({ attachment: fixture, runId: "failure-put", storage: putFailureStorage, repository: new MemoryRepository() }), "PUT_FAILED_AFTER_REMOTE_SIDE_EFFECT");
  assert.equal(putFailureStorage.objects.size, 0);

  const persistenceStorage = new MemoryStorage();
  const persistenceRepository = new PersistenceFailureRepository();
  await expectRejected(() => migrateSyntheticAttachment({ attachment: fixture, runId: "failure-persistence", storage: persistenceStorage, repository: persistenceRepository }), "PERSISTENCE_FAILED_AFTER_WRITE");
  assert.equal(persistenceStorage.objects.size, 0);
  assert.equal(persistenceRepository.records.size, 0);

  console.log(JSON.stringify({
    providerIdentity: "PASS",
    deterministicKey: "PASS",
    realAssetManifestShape: "PASS",
    deliveryUrlValidFallback: "PASS",
    deliveryUrlInvalidCases: "PASS",
    metadataPropagation: "PASS",
    upload: "PASS",
    byteVerification: "PASS",
    idempotentRerunExactBytes: "PASS",
    sameSizeByteConflict: "PASS",
    checksumConflict: "PASS",
    missingObjectFailure: "PASS",
    failureAfterUploadCleanup: "PASS",
    failureDuringPersistenceCleanup: "PASS",
    urlValidationFailureCleanup: "PASS",
    finalObjectCount: 0,
    finalRecordCount: 0,
    productionContacted: false,
    realR2DryRun: false,
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
