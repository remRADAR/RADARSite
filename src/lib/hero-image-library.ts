import type { HeroSlide } from "./radar-content";

/**
 * RADARSite hero image library — GitHub-managed hero artwork.
 *
 * Source files live in `public/images/hero/` (see that folder's README.md for
 * format, naming, and processing guidelines). Add an entry here after
 * uploading a WebP file; the hero cube engine picks the library up
 * automatically. While this array is empty, the hero falls back to the
 * legacy Google Drive slides in `radar-content.ts`.
 */
export type HeroImageFocalPoint = { x: number; y: number };

export type HeroImageEntry = {
  /** Stable slide id, e.g. "hero-artist-001". Must match the filename stem. */
  id: string;
  /** Repository asset path, always under /images/hero/. */
  src: string;
  /** Descriptive alternative text for the artwork. */
  alt: string;
  /** 0-100 percentage point kept in frame whenever the layout crops. */
  focalPoint?: HeroImageFocalPoint;
  /**
   * "contain" shows the full portrait (blurred focal-aware backdrop fills the
   * landscape hero); "cover" fills the frame and crops around the focal point.
   * Default: "contain".
   */
  fit?: "contain" | "cover";
  order?: number;
  active?: boolean;
};

export const HERO_IMAGE_LIBRARY_PUBLIC_PATH = "/images/hero/";

export const heroImages: HeroImageEntry[] = [
  // Upload a WebP to public/images/hero/, then add an entry, e.g.:
  // { id: "hero-artist-001", src: "/images/hero/hero-artist-001.webp",
  //   alt: "Featured artist portrait", focalPoint: { x: 50, y: 35 }, fit: "contain" },
];

export function isHeroLibraryConfigured() {
  return heroImages.length > 0;
}

/** Library entries mapped to hero slides, ordered and active-only. */
export function getLibraryHeroSlides(): HeroSlide[] {
  return heroImages
    .map((entry, index) => ({
      id: entry.id,
      type: "image" as const,
      src: entry.src,
      alt: entry.alt,
      order: entry.order ?? index + 1,
      active: entry.active !== false,
      focalPoint: entry.focalPoint,
      fit: entry.fit ?? ("contain" as const),
    }))
    .filter((slide) => slide.active)
    .sort((a, b) => a.order - b.order);
}

/** CSS object-position for a focal point; centre by default. */
export function focalPointToObjectPosition(focalPoint?: HeroImageFocalPoint) {
  if (!focalPoint) return "50% 50%";
  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  return clamp(focalPoint.x) + "% " + clamp(focalPoint.y) + "%";
}
