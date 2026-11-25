export type ArtworkPalette = { hue: number; saturation: number; lightness: number };

const paletteCache = new Map<string, Promise<ArtworkPalette | null>>();

export function dominantHueFromPixels(data: Uint8ClampedArray): ArtworkPalette | null {
  let bestHue = -1;
  let bestScore = -1;
  let bestLightness = 0;
  let bestSaturation = 0;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 200) continue;
    const red = data[index] / 255;
    const green = data[index + 1] / 255;
    const blue = data[index + 2] / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const lightness = (max + min) / 2;
    const spread = max - min;
    if (spread <= 0) continue;
    const saturation = spread / Math.max(max, 0.0001);
    const score = (saturation * 0.25 + spread) * (0.55 + lightness * 0.25);
    if (score <= bestScore) continue;
    bestScore = score;
    let hue;
    if (max === red) hue = ((green - blue) / spread + (green < blue ? 6 : 0)) * 60;
    else if (max === green) hue = ((blue - red) / spread + 2) * 60;
    else hue = ((red - green) / spread + 4) * 60;
    bestHue = hue;
    bestLightness = Math.min(58, Math.max(18, lightness * 46));
    bestSaturation = Math.min(85, saturation * 92) + 8;
  }
  if (bestHue < 0) return null;
  const hue = Math.round(bestHue);
  const light = Math.round(bestLightness);
  return { hue, saturation: Math.round(bestSaturation), lightness: light };
}

export function extractArtworkPalette(artworkUrl?: string): Promise<ArtworkPalette | null> {
  if (!artworkUrl || typeof window === "undefined") return Promise.resolve(null);
  const cached = paletteCache.get(artworkUrl);
  if (cached) return cached;
  const palette = new Promise<ArtworkPalette | null>((resolve) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    const finish = (palette: ArtworkPalette | null) => resolve(palette);
    image.onerror = () => finish(null);
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return finish(null);
        context.drawImage(image, 0, 0, 16, 16);
        finish(dominantHueFromPixels(context.getImageData(0, 0, 16, 16).data));
      } catch {
        finish(null);
      }
    };
    image.src = artworkUrl;
  });
  paletteCache.set(artworkUrl, palette);
  return palette;
}
