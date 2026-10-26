import type { HeroSlide } from "./radar-content";

/**
 * RADARSite hero image library — GitHub-managed hero artwork.
 *
 * Source files live in `public/images/hero/` (see that folder's README.md for
 * format, naming, and processing guidelines). Add an entry here after
 * uploading a WebP file; the hero cube engine picks the library up
 * automatically. While there are no active entries, the hero falls back to
 * the legacy Google Drive slides in `radar-content.ts`.
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
  {"id": "radar-hero-001", "src": "/images/hero/radar-hero-001.webp", "alt": "RADAR hero image 1", "order": 1, "active": true},
  {"id": "radar-hero-002", "src": "/images/hero/radar-hero-002.webp", "alt": "RADAR hero image 2", "order": 2, "active": true},
  {"id": "radar-hero-003", "src": "/images/hero/radar-hero-003.webp", "alt": "RADAR hero image 3", "order": 3, "active": true},
  {"id": "radar-hero-004", "src": "/images/hero/radar-hero-004.webp", "alt": "RADAR hero image 4", "order": 4, "active": true},
  {"id": "radar-hero-005", "src": "/images/hero/radar-hero-005.webp", "alt": "RADAR hero image 5", "order": 5, "active": true},
  {"id": "radar-hero-006", "src": "/images/hero/radar-hero-006.webp", "alt": "RADAR hero image 6", "order": 6, "active": true},
  {"id": "radar-hero-007", "src": "/images/hero/radar-hero-007.webp", "alt": "RADAR hero image 7", "order": 7, "active": true},
  {"id": "radar-hero-008", "src": "/images/hero/radar-hero-008.webp", "alt": "RADAR hero image 8", "order": 8, "active": true},
  {"id": "radar-hero-009", "src": "/images/hero/radar-hero-009.webp", "alt": "RADAR hero image 9", "order": 9, "active": true},
  {"id": "radar-hero-010", "src": "/images/hero/radar-hero-010.webp", "alt": "RADAR hero image 10", "order": 10, "active": true},
  {"id": "radar-hero-011", "src": "/images/hero/radar-hero-011.webp", "alt": "RADAR hero image 11", "order": 11, "active": true},
  {"id": "radar-hero-012", "src": "/images/hero/radar-hero-012.webp", "alt": "RADAR hero image 12", "order": 12, "active": true},
  {"id": "radar-hero-013", "src": "/images/hero/radar-hero-013.webp", "alt": "RADAR hero image 13", "order": 13, "active": true},
  {"id": "radar-hero-014", "src": "/images/hero/radar-hero-014.webp", "alt": "RADAR hero image 14", "order": 14, "active": true},
  {"id": "radar-hero-015", "src": "/images/hero/radar-hero-015.webp", "alt": "RADAR hero image 15", "order": 15, "active": true},
  {"id": "radar-hero-016", "src": "/images/hero/radar-hero-016.webp", "alt": "RADAR hero image 16", "order": 16, "active": true},
  {"id": "radar-hero-017", "src": "/images/hero/radar-hero-017.webp", "alt": "RADAR hero image 17", "order": 17, "active": true},
  {"id": "radar-hero-018", "src": "/images/hero/radar-hero-018.webp", "alt": "RADAR hero image 18", "order": 18, "active": true},
  {"id": "radar-hero-019", "src": "/images/hero/radar-hero-019.webp", "alt": "RADAR hero image 19", "order": 19, "active": true},
  {"id": "radar-hero-020", "src": "/images/hero/radar-hero-020.webp", "alt": "RADAR hero image 20", "order": 20, "active": true},
  {"id": "radar-hero-021", "src": "/images/hero/radar-hero-021.webp", "alt": "RADAR hero image 21", "order": 21, "active": true},
  {"id": "radar-hero-022", "src": "/images/hero/radar-hero-022.webp", "alt": "RADAR hero image 22", "order": 22, "active": true},
  {"id": "radar-hero-023", "src": "/images/hero/radar-hero-023.webp", "alt": "RADAR hero image 23", "order": 23, "active": true},
  {"id": "radar-hero-024", "src": "/images/hero/radar-hero-024.webp", "alt": "RADAR hero image 24", "order": 24, "active": true},
  {"id": "radar-hero-025", "src": "/images/hero/radar-hero-025.webp", "alt": "RADAR hero image 25", "order": 25, "active": true},
  {"id": "radar-hero-026", "src": "/images/hero/radar-hero-026.webp", "alt": "RADAR hero image 26", "order": 26, "active": true},
  {"id": "radar-hero-027", "src": "/images/hero/radar-hero-027.webp", "alt": "RADAR hero image 27", "order": 27, "active": true},
  {"id": "radar-hero-028", "src": "/images/hero/radar-hero-028.webp", "alt": "RADAR hero image 28", "order": 28, "active": true},
  {"id": "radar-hero-029", "src": "/images/hero/radar-hero-029.webp", "alt": "RADAR hero image 29", "order": 29, "active": true},
  {"id": "radar-hero-030", "src": "/images/hero/radar-hero-030.webp", "alt": "RADAR hero image 30", "order": 30, "active": true},
  {"id": "radar-hero-031", "src": "/images/hero/radar-hero-031.webp", "alt": "RADAR hero image 31", "order": 31, "active": true},
  {"id": "radar-hero-032", "src": "/images/hero/radar-hero-032.webp", "alt": "RADAR hero image 32", "order": 32, "active": true},
  {"id": "radar-hero-033", "src": "/images/hero/radar-hero-033.webp", "alt": "RADAR hero image 33", "order": 33, "active": true},
  {"id": "radar-hero-034", "src": "/images/hero/radar-hero-034.webp", "alt": "RADAR hero image 34", "order": 34, "active": true},
  {"id": "radar-hero-035", "src": "/images/hero/radar-hero-035.webp", "alt": "RADAR hero image 35", "order": 35, "active": true},
  {"id": "radar-hero-036", "src": "/images/hero/radar-hero-036.webp", "alt": "RADAR hero image 36", "order": 36, "active": true},
  {"id": "radar-hero-037", "src": "/images/hero/radar-hero-037.webp", "alt": "RADAR hero image 37", "order": 37, "active": true},
  {"id": "radar-hero-038", "src": "/images/hero/radar-hero-038.webp", "alt": "RADAR hero image 38", "order": 38, "active": true},
  {"id": "radar-hero-039", "src": "/images/hero/radar-hero-039.webp", "alt": "RADAR hero image 39", "order": 39, "active": true},
  {"id": "radar-hero-040", "src": "/images/hero/radar-hero-040.webp", "alt": "RADAR hero image 40", "order": 40, "active": true},
  {"id": "radar-hero-041", "src": "/images/hero/radar-hero-041.webp", "alt": "RADAR hero image 41", "order": 41, "active": true},
  {"id": "radar-hero-042", "src": "/images/hero/radar-hero-042.webp", "alt": "RADAR hero image 42", "order": 42, "active": true},
  {"id": "radar-hero-043", "src": "/images/hero/radar-hero-043.webp", "alt": "RADAR hero image 43", "order": 43, "active": true},
  {"id": "radar-hero-044", "src": "/images/hero/radar-hero-044.webp", "alt": "RADAR hero image 44", "order": 44, "active": true},
  {"id": "radar-hero-045", "src": "/images/hero/radar-hero-045.webp", "alt": "RADAR hero image 45", "order": 45, "active": true},
  {"id": "radar-hero-046", "src": "/images/hero/radar-hero-046.webp", "alt": "RADAR hero image 46", "order": 46, "active": true},
  {"id": "radar-hero-047", "src": "/images/hero/radar-hero-047.webp", "alt": "RADAR hero image 47", "order": 47, "active": true},
  {"id": "radar-hero-048", "src": "/images/hero/radar-hero-048.webp", "alt": "RADAR hero image 48", "order": 48, "active": true},
  {"id": "radar-hero-049", "src": "/images/hero/radar-hero-049.webp", "alt": "RADAR hero image 49", "order": 49, "active": true},
  {"id": "radar-hero-050", "src": "/images/hero/radar-hero-050.webp", "alt": "RADAR hero image 50", "order": 50, "active": true},
  {"id": "radar-hero-051", "src": "/images/hero/radar-hero-051.webp", "alt": "RADAR hero image 51", "order": 51, "active": true},
  {"id": "radar-hero-052", "src": "/images/hero/radar-hero-052.webp", "alt": "RADAR hero image 52", "order": 52, "active": true},
  {"id": "radar-hero-053", "src": "/images/hero/radar-hero-053.webp", "alt": "RADAR hero image 53", "order": 53, "active": true},
  {"id": "radar-hero-054", "src": "/images/hero/radar-hero-054.webp", "alt": "RADAR hero image 54", "order": 54, "active": true},
  {"id": "radar-hero-055", "src": "/images/hero/radar-hero-055.webp", "alt": "RADAR hero image 55", "order": 55, "active": true},
  {"id": "radar-hero-056", "src": "/images/hero/radar-hero-056.webp", "alt": "RADAR hero image 56", "order": 56, "active": true},
  {"id": "radar-hero-057", "src": "/images/hero/radar-hero-057.webp", "alt": "RADAR hero image 57", "order": 57, "active": true},
  {"id": "radar-hero-058", "src": "/images/hero/radar-hero-058.webp", "alt": "RADAR hero image 58", "order": 58, "active": true},
];

export function isHeroLibraryConfigured(entries: readonly HeroImageEntry[] = heroImages) {
  return entries.some((entry) => entry.active !== false);
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
