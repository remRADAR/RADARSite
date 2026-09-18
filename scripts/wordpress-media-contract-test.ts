import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dryRunObjectKey, mediaIdentity, migrateSyntheticAttachment, type DryRunMediaRepository, type DryRunMediaStorage, type SyntheticWordPressAttachment } from "../src/lib/wordpress-media-dry-run";
import type { ContentMediaRecord } from "../src/lib/content-server";
import type { StoredMedia } from "../src/lib/media-storage";

class MemoryStorage implements DryRunMediaStorage {
  readonly objects = new Map<string, { body: Buffer; contentType: string; url: string; metadata: Record<string, string> }>();
  async put(input: { key: string; body: Buffer; contentType: string; metadata?: Record<string, string> }): Promise<StoredMedia> {
    if (this.objects.has(input.key)) throw new Error(`OBJECT_ALREADY_EXISTS:${input.key}`);
    const value = { body: Buffer.from(input.body), contentType: input.contentType, url: `https://media.example.test/${input.key}`, metadata: input.metadata || {} };
    this.objects.set(input.key, value);
    return { key: input.key, url: value.url, provider: "r2", bucket: "synthetic-dry-run", contentType: value.contentType, size: value.body.byteLength, etag: createHash("md5").update(value.body).digest("hex") };
  }
  async head(key: string) {
    const object = this.objects.get(key);
    if (!object) throw new Error(`NOT_FOUND:${key}`);
    return { key, url: object.url, contentType: object.contentType, size: object.body.byteLength, metadata: object.metadata };
  }
  async get(key: string) {
    const object = this.objects.get(key);
    if (!object) throw new Error(`NOT_FOUND:${key}`);
    return Buffer.from(object.body);
  }
  async delete(key: string) { this.objects.delete(key); }
}

class MemoryRepository implements DryRunMediaRepository {
  readonly records = new Map<string, ContentMediaRecord>();
  async findByIdentity(identity: string) { return [...this.records.values()].find((record) => record.provenance && typeof record.provenance === "object" && record.provenance.mediaIdentity === identity); }
  async upsert(record: ContentMediaRecord) { this.records.set(record.id, record); }
  async delete(id: string) { this.records.delete(id); }
}

const storage = new MemoryStorage();
const repository = new MemoryRepository();
const runId = "mother-base-fixture-001";
const sourceBytes = Buffer.from("synthetic-wordpress-image-bytes", "utf8");
const fixture: SyntheticWordPressAttachment = {
  provider: "legacy",
  attachmentId: "123",
  sourceUrl: "https://remradar.wordpress.com/wp-content/uploads/2020/01/synthetic-image.png",
  originalFilename: "synthetic-image.png",
  mimeType: "image/png",
  width: 640,
  height: 360,
  sourceBytes,
  wordpressMetadata: { alt: "Synthetic fixture", caption: "Contract test" },
};
const expectedIdentity = "media:legacy:123";
const expectedKey = "site-assets/wordpress-dry-run/mother-base-fixture-001/legacy/attachments/123/original.png";

async function expectRejected(action: () => Promise<unknown>, message: string) {
  await assert.rejects(action, new RegExp(message));
}

async function main() {
  assert.equal(mediaIdentity(fixture), expectedIdentity);
  assert.equal(dryRunObjectKey({ ...fixture, runId }), expectedKey);
  assert.notEqual(dryRunObjectKey({ ...fixture, provider: "radarcharts", runId }), expectedKey);

  const first = await migrateSyntheticAttachment({ attachment: fixture, runId, storage, repository });
  assert.equal(first.uploaded, true);
  assert.equal(first.reused, false);
  assert.equal(first.key, expectedKey);
  assert.equal(first.contentMedia.sourceProvider, "legacy");
  assert.equal(first.contentMedia.sourceId, "123");
  assert.equal(first.contentMedia.checksum, createHash("sha256").update(sourceBytes).digest("hex"));
  assert.equal(new URL(first.deliveryUrl).protocol, "https:");
  assert.equal((await storage.get(first.key)).equals(sourceBytes), true);
  assert.equal((await storage.head(first.key)).contentType, "image/png");

  const second = await migrateSyntheticAttachment({ attachment: fixture, runId, storage, repository });
  assert.equal(second.reused, true);
  assert.equal(second.uploaded, false);
  assert.equal(second.mediaId, first.mediaId);
  assert.equal(storage.objects.size, 1);
  assert.equal(repository.records.size, 1);

  const conflict = { ...fixture, sourceBytes: Buffer.from("changed-source-bytes", "utf8") };
  await expectRejected(() => migrateSyntheticAttachment({ attachment: conflict, runId, storage, repository }), "MEDIA_CHECKSUM_CONFLICT");
  assert.equal(storage.objects.size, 1);
  assert.equal(repository.records.size, 1);

  await expectRejected(() => migrateSyntheticAttachment({ attachment: { ...fixture, attachmentId: "after-upload" }, runId: "failure-upload", storage, repository, failAfterUpload: true }), "FORCED_FAILURE_AFTER_UPLOAD");
  assert.equal(storage.objects.has(dryRunObjectKey({ ...fixture, attachmentId: "after-upload", runId: "failure-upload" })), false);
  assert.equal(repository.records.size, 1);

  await expectRejected(() => migrateSyntheticAttachment({ attachment: { ...fixture, attachmentId: "during-persistence" }, runId: "failure-persistence", storage, repository, failDuringPersistence: true }), "FORCED_FAILURE_DURING_PERSISTENCE");
  assert.equal(storage.objects.has(dryRunObjectKey({ ...fixture, attachmentId: "during-persistence", runId: "failure-persistence" })), false);
  assert.equal(repository.records.size, 1);

  await repository.delete(first.mediaId);
  await storage.delete(first.key);
  assert.equal(storage.objects.size, 0);
  assert.equal(repository.records.size, 0);

  console.log(JSON.stringify({
    providerIdentity: "PASS",
    deterministicKey: "PASS",
    metadataPropagation: "PASS",
    upload: "PASS",
    byteVerification: "PASS",
    deliveryUrl: "PASS",
    idempotentRerun: "PASS",
    checksumConflict: "PASS",
    failureAfterUploadCleanup: "PASS",
    failureDuringPersistenceCleanup: "PASS",
    finalObjectCount: storage.objects.size,
    finalRecordCount: repository.records.size,
    productionContacted: false,
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
