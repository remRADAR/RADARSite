import assert from "node:assert/strict";
import { createWebpDerivatives } from "../src/lib/media-storage";

async function main() {
  const { default: sharp } = await import("sharp");
  const width = 64;
  const height = 32;
  const raw = Buffer.alloc(width * height * 3);
  for (let index = 0; index < raw.length; index++) raw[index] = (index * 37 + Math.floor(index / 3) * 71) % 256;
  const source = await sharp(raw, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 0 }).toBuffer();

  const result = await createWebpDerivatives({ source, keyPrefix: "contract/small-image" });
  assert.equal(result.sourceWidth, width);
  assert.equal(result.sourceHeight, height);
  assert.equal(result.sourceBytes, source.byteLength);
  assert.equal(result.derivatives.length, 1, "small sources should produce one non-upscaled derivative");
  assert.equal(result.derivatives[0]?.width, width);
  assert.equal(result.derivatives[0]?.key, `contract/small-image/w-${width}.webp`);
  assert.equal(result.derivatives[0]?.contentType, "image/webp");
  assert.equal(result.derivativeBytes, result.derivatives.reduce((total, item) => total + item.body.byteLength, 0));
  assert.ok(result.bytesSaved > 0, "the synthetic image should be smaller after WebP conversion");
  assert.ok(result.savingsRatio > 0 && result.savingsRatio <= 1);
  for (const derivative of result.derivatives) {
    const metadata = await sharp(derivative.body).metadata();
    assert.equal(metadata.format, "webp");
    assert.ok((metadata.width || 0) <= width, "conversion must not upscale a source image");
  }

  await assert.rejects(createWebpDerivatives({ source, keyPrefix: "contract/quality-zero", quality: 0 }), /WEBP_QUALITY_INVALID/);
  await assert.rejects(createWebpDerivatives({ source, keyPrefix: "contract/quality-high", quality: 101 }), /WEBP_QUALITY_INVALID/);
  await assert.rejects(createWebpDerivatives({ source, keyPrefix: "contract/width-zero", width: 0 }), /WEBP_WIDTH_INVALID/);

  console.log(JSON.stringify({
    smallImageHasDerivative: true,
    noUpscale: true,
    webpFormatVerified: true,
    measuredBytesSaved: result.bytesSaved,
    savingsRatio: result.savingsRatio,
    invalidQualityRejected: true,
    invalidWidthRejected: true,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
