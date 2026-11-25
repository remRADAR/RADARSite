import assert from "node:assert/strict";
import { dominantHueFromPixels } from "@/lib/artwork-palette";

function pixels(...rgb: Array<[number, number, number]>): Uint8ClampedArray {
  const data = new Uint8ClampedArray(rgb.length * 4);
  rgb.forEach(([r, g, b], index) => { data[index * 4] = r; data[index * 4 + 1] = g; data[index * 4 + 2] = b; data[index * 4 + 3] = 255; });
  return data;
}
function solid(count: number, r: number, g: number, b: number) { return pixels(...Array.from({ length: count }, () => [r, g, b] as [number, number, number])); }

const crimson = dominantHueFromPixels(solid(256, 235, 28, 43));
assert.ok(crimson);
assert.ok(crimson.hue <= 8 || crimson.hue >= 352, `expected near-red hue, got ${crimson.hue}`);
assert.ok(crimson.saturation > 40, `expected strong saturation, got ${crimson.saturation}`);

const azure = dominantHueFromPixels(solid(256, 30, 90, 220));
assert.ok(azure);
assert.ok(azure.hue > 205 && azure.hue < 245, `expected blue hue, got ${azure.hue}`);

const mixed = dominantHueFromPixels(pixels(...Array.from({ length: 200 }, () => [40, 40, 40] as [number, number, number]), ...Array.from({ length: 56 }, () => [220, 180, 40] as [number, number, number])));
assert.ok(mixed);
assert.ok(mixed.hue > 35 && mixed.hue < 75, `expected the saturated gold to win over flat greys, got ${mixed.hue}`);

const transparent = dominantHueFromPixels(new Uint8ClampedArray([220, 30, 30, 0, 220, 30, 30, 0]));
assert.equal(transparent, null);

const greyOnly = dominantHueFromPixels(solid(256, 128, 128, 128));
assert.equal(greyOnly, null);

assert.equal(dominantHueFromPixels(new Uint8ClampedArray(0)), null);

console.log("Artwork palette contract passed: dominant-hue scoring, saturation weighting, transparent and grayscale guards.");
