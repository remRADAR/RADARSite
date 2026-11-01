import assert from "node:assert/strict";
import { convertNotionImageToWebp, findStagedManifestAsset, notionAssetKey } from "../src/lib/notion-media";

async function main() {
  const { default: sharp } = await import("sharp");
  const width = 96;
  const height = 64;
  const raw = Buffer.alloc(width * height * 3);
  for (let index = 0; index < raw.length; index++) raw[index] = (index * 37 + Math.floor(index / 3) * 71) % 256;

  const sources = [
    { name: "JPEG", bytes: await sharp(raw, { raw: { width, height, channels: 3 } }).jpeg({ quality: 92 }).toBuffer(), contentType: "image/jpeg" },
    { name: "PNG", bytes: await sharp(raw, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 0 }).toBuffer(), contentType: "image/png" },
  ];

  for (const source of sources) {
    const result = await convertNotionImageToWebp({ bytes: source.bytes, contentType: source.contentType });
    const metadata = await sharp(result.body).metadata();
    assert.equal(metadata.format, "webp", `${source.name} upload should be converted to WebP`);
    assert.equal(result.sourceMimeType, source.contentType);
    assert.equal(result.sourceBytes, source.bytes.byteLength);
    assert.equal(result.checksum.length, 64);
    assert.equal(result.sourceChecksum.length, 64);
    assert.ok((result.width || 0) <= 2400 && (result.height || 0) <= 2400, "encoded dimensions must fit within the configured maximum edge");
    assert.equal(notionAssetKey(result.checksum, "webp"), `notion/assets/${result.checksum.slice(0, 2)}/${result.checksum}.webp`);
    assert.ok(result.body.byteLength < source.bytes.byteLength, `${source.name} test fixture should be smaller as WebP`);
  }

  await assert.rejects(convertNotionImageToWebp({ bytes: sources[0]!.bytes, contentType: "image/png" }), /does not match its media type/);
  await assert.rejects(convertNotionImageToWebp({ bytes: Buffer.from("not an image"), contentType: "image/jpeg" }), /invalid or unsupported/);

  const staged = [
    { pageId: "page-1", blockId: "featured-image", sourceUrlWithoutQuery: "https://cdn.example/old-cover.webp" },
    { pageId: "page-1", blockId: "featured-image", sourceUrlWithoutQuery: "https://cdn.example/current-cover.webp" },
  ];
  assert.equal(findStagedManifestAsset(staged, { pageId: "page-1", blockId: "featured-image", url: "https://cdn.example/current-cover.webp?signature=rotated" })?.sourceUrlWithoutQuery, "https://cdn.example/current-cover.webp", "rotated signed URLs match the current staged source path");
  assert.equal(findStagedManifestAsset(staged, { pageId: "page-1", blockId: "featured-image", url: "https://cdn.example/replaced-cover.webp?signature=current" }), undefined, "a replaced file cannot reuse an older staged object by page/block ID alone");
  assert.equal(findStagedManifestAsset(staged, { pageId: "another-page", blockId: "featured-image", url: "https://cdn.example/current-cover.webp" }), undefined, "staged images remain page-scoped");

  console.log(JSON.stringify({
    jpegConvertedToWebp: true,
    pngConvertedToWebp: true,
    outputDimensionsCapped: true,
    objectKeysUseWebpExtension: true,
    sourceMimeMismatchRejected: true,
    corruptImageRejected: true,
    stagedManifestMatchesCurrentSource: true,
    stagedManifestRejectsReplacedSource: true,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
