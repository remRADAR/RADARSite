/**
 * Studio media contract test.
 *
 * Covers the media library registry and the upload pipeline with an in-memory
 * object store, so no network, credentials, or database are required. sharp
 * is used when available (it is a production dependency and CI installs it)
 * to generate real JPEG/PNG fixtures and verify the WebP conversion path.
 */
import assert from "node:assert/strict";

import {
  buildMediaStorageKey,
  deletionGuard,
  detectImageSignature,
  filterMediaAssets,
  findMediaReferences,
  isSafeMediaStorageKey,
  MEDIA_LIBRARY_MANIFEST_KEY,
  mediaLibraryAssetId,
  sanitizeMediaFilename,
  validateMediaLibraryManifest,
  type MediaLibraryAsset,
} from "../src/lib/media-library";
import { MediaUploadValidationError, maxMediaUploadBytes, processStudioImageUpload, type MediaObjectStore } from "../src/lib/media-upload";

const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

type StoredObject = { key: string; body: Buffer; contentType: string; metadata?: Record<string, string> };

function memoryStore(objects: Map<string, StoredObject>, failure?: { message: string }): MediaObjectStore {
  return async (input) => {
    if (failure) throw new Error(failure.message);
    const body = Buffer.from(input.body);
    objects.set(input.key, { key: input.key, body, contentType: input.contentType, metadata: input.metadata });
    return { key: input.key, url: `https://media.radarcharts.net/${input.key.split("/").map(encodeURIComponent).join("/")}`, provider: "r2", bucket: "radarsite-media", contentType: input.contentType, size: body.byteLength, etag: "test-etag" };
  };
}

function memoryRemove(objects: Map<string, StoredObject>) {
  return async (key: string) => { objects.delete(key); };
}

function assetFixture(overrides: Partial<MediaLibraryAsset> = {}): MediaLibraryAsset {
  const storageKey = "studio/assets/2026/11/abcdef0123456789-test-image.webp";
  return {
    id: mediaLibraryAssetId(storageKey),
    title: "Test image",
    originalFilename: "test-image.png",
    storageKey,
    derivedKeys: [],
    deliveryUrl: `https://media.radarcharts.net/${storageKey}`,
    mimeType: "image/png",
    deliveredMime: "image/webp",
    fileSize: 1234,
    width: 800,
    height: 600,
    alt: "An artist on stage",
    caption: "Live at the stadium",
    checksum: "a".repeat(64),
    sourceChecksum: "b".repeat(64),
    createdAt: "2026-11-27T00:00:00.000Z",
    uploader: "studio",
    ...overrides,
  };
}

function expectValidationError(promise: Promise<unknown>, code: string) {
  return promise.then(
    () => { throw new Error(`expected ${code} rejection`); },
    (error: unknown) => {
      assert.ok(error instanceof MediaUploadValidationError, `expected MediaUploadValidationError, got ${String(error)}`);
      assert.equal(error.code, code);
    },
  );
}

async function main() {
  let sharpAvailable = false;
  let jpeg8 = Buffer.alloc(0);
  let png8 = PNG_1PX;
  try {
    const { default: sharp } = await import("sharp");
    jpeg8 = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#123456" } }).jpeg().toBuffer();
    png8 = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#654321" } }).png().toBuffer();
    sharpAvailable = true;
  } catch {
    console.warn("sharp unavailable; conversion-specific assertions are skipped (signature-level checks still run)");
  }

  // 1. File-signature detection
  assert.deepEqual(detectImageSignature(png8), { format: "png", mime: "image/png" });
  assert.deepEqual(detectImageSignature(jpeg8), { format: "jpeg", mime: "image/jpeg" });
  assert.deepEqual(detectImageSignature(Buffer.concat([Buffer.from("GIF87a"), Buffer.alloc(8)])), { format: "gif", mime: "image/gif" });
  assert.deepEqual(detectImageSignature(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")])), { format: "webp", mime: "image/webp" });
  assert.deepEqual(detectImageSignature(Buffer.concat([Buffer.alloc(4), Buffer.from("ftypavif"), Buffer.alloc(4)])), { format: "avif", mime: "image/avif" });
  assert.equal(detectImageSignature(Buffer.from("<html>not an image at all...")), null);
  assert.equal(detectImageSignature(Buffer.alloc(0)), null);
  assert.equal(detectImageSignature(Buffer.concat([Buffer.alloc(4), Buffer.from("ftypisom"), Buffer.alloc(4)])), null, "non-AVIF ISOBMFF containers are rejected");

  // 2. Declared MIME must match the real content
  {
    const objects = new Map<string, StoredObject>();
    await processStudioImageUpload({ bytes: png8, filename: "a.jpg", declaredMime: "image/png", store: memoryStore(objects), registerAsset: async () => undefined, randomHex: "a".repeat(16), now: new Date("2026-11-27T00:00:00Z") });
  }
  await expectValidationError(processStudioImageUpload({ bytes: png8, filename: "a.jpg", declaredMime: "image/jpeg", store: memoryStore(new Map()), registerAsset: async () => undefined }), "MEDIA_MIME_MISMATCH");
  await expectValidationError(processStudioImageUpload({ bytes: Buffer.from("totally not an image but quite long"), filename: "a.jpg", store: memoryStore(new Map()), registerAsset: async () => undefined }), "MEDIA_FORMAT_UNSUPPORTED");
  await expectValidationError(processStudioImageUpload({ bytes: Buffer.alloc(0), filename: "a.jpg", store: memoryStore(new Map()), registerAsset: async () => undefined }), "MEDIA_UPLOAD_EMPTY");

  // 3. Configurable size limit (floor 1 KiB, default 8 MiB)
  assert.equal(maxMediaUploadBytes(), 8 * 1024 * 1024);
  const previousLimit = process.env.RADAR_MEDIA_MAX_UPLOAD_BYTES;
  process.env.RADAR_MEDIA_MAX_UPLOAD_BYTES = "1024";
  assert.equal(maxMediaUploadBytes(), 1024);
  await expectValidationError(processStudioImageUpload({ bytes: Buffer.concat([png8, Buffer.alloc(2048)]), filename: "a.png", store: memoryStore(new Map()), registerAsset: async () => undefined }), "MEDIA_UPLOAD_TOO_LARGE");
  process.env.RADAR_MEDIA_MAX_UPLOAD_BYTES = previousLimit;

  // 4. Filename sanitization is traversal-safe
  assert.deepEqual(sanitizeMediaFilename("../../etc/passwd.jpg"), { base: "passwd", extension: "jpg" });
  assert.deepEqual(sanitizeMediaFilename("..\\..\\windows\\evil.PNG"), { base: "evil", extension: "png" });
  assert.deepEqual(sanitizeMediaFilename("My Band (live @ show) 2026.JPeG"), { base: "my-band-live-show-2026", extension: "jpeg" });
  assert.equal(sanitizeMediaFilename("no-extension"), null);
  assert.equal(sanitizeMediaFilename(".txt-only.txt"), null);
  assert.equal(sanitizeMediaFilename(""), null);

  // 5. Storage keys: unique, safe, no overwrite on duplicate names
  const keyA = buildMediaStorageKey({ filename: "../../etc/passwd.jpg", now: new Date("2026-11-27T00:00:00Z"), randomHex: "0123456789abcdef" });
  const keyB = buildMediaStorageKey({ filename: "../../etc/passwd.jpg", now: new Date("2026-11-27T00:00:00Z"), randomHex: "fedcba9876543210" });
  assert.notEqual(keyA, keyB, "duplicate filenames must never overwrite existing assets");
  assert.ok(isSafeMediaStorageKey(keyA) && isSafeMediaStorageKey(keyB), keyA);
  assert.ok(keyA.startsWith("studio/assets/2026/11/"), keyA);
  assert.throws(() => buildMediaStorageKey({ filename: "missing-ext" }), /MEDIA_FILENAME_INVALID/);
  assert.throws(() => buildMediaStorageKey({ filename: "no-extension" }), /MEDIA_FILENAME_INVALID/);

  // 6. Asset ids are deterministic and key-bound
  assert.equal(mediaLibraryAssetId(keyA), mediaLibraryAssetId(keyA));
  assert.notEqual(mediaLibraryAssetId(keyA), mediaLibraryAssetId(keyB));
  assert.match(mediaLibraryAssetId(keyA), /^studio-media:[a-f0-9]{64}$/);

  // 7. Reference detection across featured, social and inline placements
  const asset = assetFixture();
  const records = [
    { id: "a1", slug: "one", title: "One", status: "published", featuredImage: asset.deliveryUrl },
    { id: "a2", slug: "two", title: "Two", status: "draft", socialImage: `https://media.radarcharts.net/${asset.storageKey}` },
    { id: "a3", slug: "three", title: "Three", status: "published", bodyHtml: `<p>before</p><figure><img src="${asset.deliveryUrl}" alt="x" /><figcaption>y</figcaption></figure><p>after</p>` },
    { id: "a4", slug: "four", title: "Four", status: "published", bodyHtml: "<p>no images here</p>" },
    { id: "a5", slug: "five", title: "Five", status: "published", featuredImage: "https://media.radarcharts.net/other/image.png" },
  ];
  const references = findMediaReferences(asset, records);
  assert.deepEqual(references.map((reference) => reference.id).sort(), ["a1", "a2", "a3"]);
  assert.deepEqual(references.find((reference) => reference.id === "a1")?.roles, ["featured"]);
  assert.deepEqual(references.find((reference) => reference.id === "a2")?.roles, ["social"]);
  assert.deepEqual(references.find((reference) => reference.id === "a3")?.roles, ["inline"]);
  assert.equal(findMediaReferences(assetFixture({ storageKey: "studio/assets/2026/11/0000000000000000-none.webp", deliveryUrl: "https://media.radarcharts.net/studio/assets/2026/11/0000000000000000-none.webp" }), records).length, 0);

  // 8. Deletion guard
  assert.equal(deletionGuard({ references: [], force: false }).allowed, true);
  assert.equal(deletionGuard({ references, force: false }).allowed, false);
  assert.equal(deletionGuard({ references, force: true }).allowed, true);
  assert.match(deletionGuard({ references, force: false }).reason || "", /3 article/);

  // 9. Library search, type filter and pagination
  const assets = [assetFixture(), assetFixture({ id: "x2", title: "Second asset", originalFilename: "second.png", mimeType: "image/jpeg", deliveredMime: undefined, createdAt: "2026-11-26T00:00:00.000Z" })];
  assert.equal(filterMediaAssets(assets, { search: "second" }).items.length, 1);
  assert.equal(filterMediaAssets(assets, { search: "TEST-IMAGE" }).items.length, 1, "search is case-insensitive over filename and title");
  assert.equal(filterMediaAssets(assets, { mime: "image/jpeg" }).items.length, 1);
  assert.equal(filterMediaAssets(assets, { mime: "image/webp" }).items.length, 1, "the delivered WebP derivative type is searchable");
  assert.equal(filterMediaAssets(assets, {}).pagination.total, 2);
  const paged = filterMediaAssets([...assets, ...assets.map((item, index) => ({ ...item, id: `${item.id}-dup-${index}` }))], { pageSize: 6, page: 1 });
  assert.equal(paged.items.length, 4);
  assert.equal(paged.pagination.pageCount, 1);

  // 10. Manifest validation: round-trip, tampering, traversal keys
  const manifest = { version: 1, updatedAt: "2026-11-27T00:00:00.000Z", assets };
  const roundTrip = validateMediaLibraryManifest(JSON.parse(JSON.stringify(manifest)));
  assert.equal(roundTrip.assets.length, 2);
  assert.throws(() => validateMediaLibraryManifest({ ...manifest, version: 2 }), /MEDIA_LIBRARY_MANIFEST_INVALID/);
  assert.throws(() => validateMediaLibraryManifest({ ...manifest, assets: "nope" }), /MEDIA_LIBRARY_MANIFEST_INVALID/);
  assert.throws(() => validateMediaLibraryManifest({ ...manifest, assets: [{ ...assetFixture(), storageKey: "../../evil.png" }] }), /MEDIA_ASSET_STORAGE_KEY_INVALID/);
  assert.throws(() => validateMediaLibraryManifest({ ...manifest, assets: [{ ...assetFixture(), deliveryUrl: "http://insecure.example/x.png" }] }), /MEDIA_ASSET_DELIVERY_URL_INVALID/);
  const stripped = validateMediaLibraryManifest({ ...manifest, assets: [{ ...assetFixture(), evilExtra: "dropped" }] }) as unknown as { assets: Array<Record<string, unknown>> };
  assert.equal("evilExtra" in stripped.assets[0], false, "unknown fields must not survive validation");

  // 11. Full upload pipeline: original preserved, WebP derivative delivered, registry written
  if (sharpAvailable) {
    const objects = new Map<string, StoredObject>();
    const registered: MediaLibraryAsset[] = [];
    const result = await processStudioImageUpload({
      bytes: png8, filename: "My Band Live.png", declaredMime: "image/png",
      alt: "Band on stage", caption: "The headliner", uploader: "studio",
      now: new Date("2026-11-27T00:00:00Z"), randomHex: "abcdef0123456789",
      store: memoryStore(objects), registerAsset: async (value) => { registered.push(value); return value; },
    });
    assert.equal(result.conversion, "webp");
    assert.ok(result.asset.storageKey.startsWith("studio/assets/2026/11/abcdef0123456789-my-band-live.png"), result.asset.storageKey);
    assert.ok(result.asset.deliveryUrl.endsWith(".webp"), result.asset.deliveryUrl);
    assert.equal(result.asset.mimeType, "image/png");
    assert.equal(result.asset.deliveredMime, "image/webp");
    assert.equal(result.asset.width, 8);
    assert.equal(result.asset.height, 8);
    assert.equal(result.asset.alt, "Band on stage");
    assert.equal(result.asset.caption, "The headliner");
    assert.equal(registered.length, 1);
    assert.ok(objects.has(result.asset.storageKey), "the original source asset must be preserved");
    assert.equal(objects.get(result.asset.storageKey)?.contentType, "image/png");
    assert.equal(objects.get(result.asset.derivedKeys[0])?.contentType, "image/webp");
    assert.equal(result.asset.id, mediaLibraryAssetId(result.asset.derivedKeys[0]));
    assert.ok(objects.get(result.asset.derivedKeys[0])?.metadata?.conversion);
  }

  // 12. Duplicate filename uploads coexist
  {
    const objects = new Map<string, StoredObject>();
    const store = memoryStore(objects);
    const upload = (bytes: Buffer, randomHex: string) => processStudioImageUpload({ bytes, filename: "same-name.png", store, registerAsset: async () => undefined, now: new Date("2026-11-27T00:00:00Z"), randomHex });
    const first = await upload(png8, "1111111111111111");
    const second = await upload(png8, "2222222222222222");
    assert.notEqual(first.asset.storageKey, second.asset.storageKey);
    assert.ok(objects.has(first.asset.storageKey) && objects.has(second.asset.storageKey));
  }

  // 13. R2 failure surfaces as a controlled error, registry untouched
  {
    const registered: MediaLibraryAsset[] = [];
    await assert.rejects(
      processStudioImageUpload({ bytes: png8, filename: "a.png", store: memoryStore(new Map(), { message: "R2 put failed" }), registerAsset: async (value) => { registered.push(value); return value; } }),
      /R2 put failed/,
    );
    assert.equal(registered.length, 0, "a failed storage write must not register an asset");
  }

  // 14. A failed registry write cleans up the objects it created
  {
    const objects = new Map<string, StoredObject>();
    await assert.rejects(
      processStudioImageUpload({ bytes: png8, filename: "a.png", store: memoryStore(objects), remove: memoryRemove(objects), registerAsset: async () => { throw new Error("registry unavailable"); } }),
      /registry unavailable/,
    );
    assert.equal(objects.size, 0, "failed uploads must not strand orphaned objects");
  }

  console.log(JSON.stringify({
    manifestKey: MEDIA_LIBRARY_MANIFEST_KEY,
    sharpAvailable,
    signatureChecks: "pass",
    mimeMismatchRejected: true,
    unsupportedFormatRejected: true,
    oversizedRejected: true,
    traversalSafeFilenames: true,
    duplicateFilenamesNeverOverwrite: true,
    deterministicAssetIds: true,
    referenceDetection: "pass",
    deletionGuard: "pass",
    searchFilterPagination: "pass",
    manifestValidation: "pass",
    originalPreserved: sharpAvailable,
    webpDerivativeDelivered: sharpAvailable,
    controlledStorageFailure: true,
    orphanCleanupOnRegistryFailure: sharpAvailable,
  }, null, 2));
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
