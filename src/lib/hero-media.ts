// Shared hero media helpers.
// The GitHub-hosted hero library (public/images/hero/, configured in
// src/lib/hero-image-library.ts) is the intended long-term source. The Google
// Drive helpers below remain supported until the library is populated and the
// new image flow is verified in production, per the hero image library brief.

const HERO_SOURCE_WIDTHS = [1080, 2000, 4096, 8192] as const;

export function heroSourceSet(source: string) {
  if (!source.includes("lh3.googleusercontent.com")) return undefined;
  return HERO_SOURCE_WIDTHS.map((width) => source.replace(/=w\d+$/, "=w" + width) + " " + width + "w").join(", ");
}

export function isOptimizableHeroSource(source: string) {
  return source.startsWith("https://lh3.googleusercontent.com/");
}

export function heroPreloadSource(source: string) {
  return isOptimizableHeroSource(source)
    ? "/_next/image?url=" + encodeURIComponent(source) + "&w=1920&q=100"
    : source;
}

/**
 * Preload and decode an image so a transition never starts on a blank frame.
 * Resolves true when decoded, false on error or timeout; never rejects.
 */
export function preloadHeroImage(source: string, timeoutMs = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    const image = new window.Image();
    let settled = false;
    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(ok);
    };
    const timer = window.setTimeout(() => settle(false), timeoutMs);
    image.decoding = "async";
    image.onload = () => {
      void image.decode().then(() => settle(true)).catch(() => settle(true));
    };
    image.onerror = () => settle(false);
    image.src = heroPreloadSource(source);
  });
}
