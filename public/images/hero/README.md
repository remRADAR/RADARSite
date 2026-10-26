# RADARSite Hero Image Library

This folder contains approved RADARSite hero images, managed directly in this
repository. It is the source of truth for homepage hero artwork and replaces
the legacy Google Drive hero sourcing once populated and verified.

## Format & source guidelines

- **Format:** WebP is strongly preferred. Upload `.webp` files only.
- **Aspect ratio:** 9:16 portrait is the recommended source ratio (the hero is
  portrait-first).
- **Minimum source size:** at least 1080 x 1920 px. For 8K-class masters the
  portrait target is 4320 x 7680 px (landscape: 7680 x 4320 px). Do not
  upscale small images by hand before uploading — use the processing script.
- **Quality:** avoid re-saving the same file repeatedly; every lossy save
  degrades the artwork. Keep the original upload untouched.
- **Color:** keep the original color profile; do not pre-grade the image —
  the hero applies its own grade.

## Naming

Use descriptive, lowercase, hyphen-separated filenames, e.g.:

- `hero-artist-001.webp`
- `hero-artist-002.webp`
- `hero-campaign-001.webp`

The filename stem (without `.webp`) must equal the `id` of its configuration
entry.

## Configuration

Register each uploaded image in `src/lib/hero-image-library.ts`:

```ts
export const heroImages: HeroImageEntry[] = [
  {
    id: "hero-artist-001",
    src: "/images/hero/hero-artist-001.webp",
    alt: "Featured artist portrait",
    focalPoint: { x: 50, y: 35 },
    fit: "contain",
  },
];
```

- `src` must always start with `/images/hero/`.
- `focalPoint` is a 0–100 percentage point (e.g. a face) that stays in frame
  whenever the layout crops the image. Do not assume faces are centered.
- `fit: "contain"` keeps the full portrait visible and fills the remaining
  landscape space with a blurred, focal-aware backdrop. `fit: "cover"` fills
  the frame and crops around the focal point.
- While this array is empty, the hero falls back to the legacy Google Drive
  slides in `src/lib/radar-content.ts`. Once the library is populated and
  verified, remove the Drive fallback there.

## Processing & validation (recommended flow)

1. Run the processor on a new upload (validates type, integrity and
   dimensions, preserves the original, generates sized derivatives, and
   optionally produces an 8K-class master — interpolated, not AI):

   ```sh
   npm run hero:process -- path/to/upload.webp --id hero-artist-001 --focal 50,35
   # optional 8K-class master:
   npm run hero:process -- path/to/upload.webp --id hero-artist-001 --upscale 8k
   ```

   Originals are kept in `originals/`, derivatives are written next to this
   README, and every run records actual output dimensions in
   `hero-images.manifest.json`.

2. Run the contract test before committing:

   ```sh
   npm run hero:contract-test
   ```

3. Verify the hero locally (`npm run dev`), then add the configuration entry.

## Replacing an image

Replace the WebP file in this folder (same filename) — no component change is
needed. If the new artwork has a different subject framing, update its
`focalPoint` in the configuration entry; the per-image focal point is
preserved independently of the file.

A `README.md` is committed here, so the folder is tracked by git and no
`.gitkeep` is required.
