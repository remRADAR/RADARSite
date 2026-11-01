/**
 * RADARSite hero image processor — high-quality WebP pipeline for the
 * GitHub-managed hero library (public/images/hero/).
 *
 * Usage:
 *   npm run hero:process -- <input.webp> --id hero-artist-001 [--focal 50,35]
 *                        [--fit contain|cover] [--upscale 8k|off] [--alt "..."]
 *
 * What it does:
 *   1. Validates file type, decodability (integrity), and dimensions.
 *   2. Preserves the original upload in public/images/hero/originals/.
 *   3. Optionally produces an 8K-class master (portrait 4320x7680 /
 *      landscape 7680x4320) using Lanczos resampling — interpolated pixels,
 *      NOT AI-generated detail. Images already large enough are kept as-is.
 *   4. Generates delivery derivatives (720/1080/1600/2160 wide) for
 *      responsive delivery, never larger than the source.
 *   5. Records actual output dimensions and status in
 *      public/images/hero/hero-images.manifest.json.
 *   6. Prints the heroImages configuration entry to add in
 *      src/lib/hero-image-library.ts.
 *
 * There is no AI upscaling service in this environment and none is invented;
 * the 8K target is a resampling ceiling, not a detail generator.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

type FocalPoint = { x: number; y: number };
type HeroManifestEntry = { id: string; [key: string]: unknown };
type HeroManifest = { images: HeroManifestEntry[] };
const EIGHT_K_CLASS = {
  portrait: { width: 4320, height: 7680 },
  landscape: { width: 7680, height: 4320 },
} as const;
const DELIVERY_WIDTHS = [720, 1080, 1600, 2160] as const;
const HERO_DIR = path.join(process.cwd(), "public", "images", "hero");
const MANIFEST_PATH = path.join(HERO_DIR, "hero-images.manifest.json");
const ALLOWED_EXTENSIONS = [".webp", ".jpg", ".jpeg", ".png"];

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const options: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      if (value === undefined) throw new Error("Missing value for --" + key);
      options[key] = value;
      i += 1;
    } else {
      positional.push(arg);
    }
  }
  return { positional, options };
}

function parseFocal(raw: string | undefined): FocalPoint | undefined {
  if (!raw) return undefined;
  const [x, y] = raw.split(",").map((part) => Number(part.trim()));
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) {
    throw new Error("--focal expects two 0-100 percentages, e.g. --focal 50,35");
  }
  return { x, y };
}

async function processHeroImage() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const input = positional[0];
  const id = options.id;
  if (!input || !id) throw new Error("Usage: npm run hero:process -- <input.webp> --id hero-artist-001 [--focal 50,35] [--fit contain|cover] [--upscale 8k|off]");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) throw new Error('id must be lowercase hyphen-separated, e.g. "hero-artist-001"');
  if (!existsSync(input)) throw new Error("Input file not found: " + input);
  const extension = path.extname(input).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) throw new Error("Unsupported input type " + extension + " — upload WebP artwork.");

  const focalPoint = parseFocal(options.focal);
  const fit = options.fit === "cover" ? "cover" : "contain";
  const upscale = options.upscale === "8k";

  // 1. Validation: full decode proves integrity; metadata proves type/dimensions.
  const image = sharp(input, { failOn: "error" });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error("Could not read image dimensions — file may be corrupt.");
  await image.clone().toBuffer(); // forces a full decode; throws on truncated files.
  const orientation = metadata.height >= metadata.width ? "portrait" : "landscape";
  const aspectRatio = metadata.width / metadata.height;
  if (extension !== ".webp") {
    console.warn("[warn] Input is " + extension + " — WebP is the preferred hero format; output derivatives will be WebP.");
  }
  if (Math.abs(aspectRatio - 9 / 16) > 0.08 && Math.abs(aspectRatio - 16 / 9) > 0.08) {
    console.warn("[warn] Aspect ratio " + aspectRatio.toFixed(3) + " is neither 9:16 nor 16:9 — the portrait-first hero layout may crop it.");
  }

  mkdirSync(path.join(HERO_DIR, "originals"), { recursive: true });
  mkdirSync(path.join(HERO_DIR, "masters"), { recursive: true });

  // 2. Preserve the original upload untouched.
  const originalPath = path.join(HERO_DIR, "originals", id + "-original" + extension);
  writeFileSync(originalPath, readFileSync(input));

  // 3. Master: 8K-class only when requested and the source is smaller.
  const target = EIGHT_K_CLASS[orientation];
  const sourceAdequate =
    (orientation === "portrait" && metadata.width >= target.width) ||
    (orientation === "landscape" && metadata.width >= target.width);
  let masterStatus: "original" | "original-adequate" | "upscaled-interpolated" = "original";
  let masterDimensions = { width: metadata.width, height: metadata.height };
  const masterPath = path.join(HERO_DIR, "masters", id + "-master.webp");
  if (upscale && !sourceAdequate) {
    const resized = sharp(input).resize(target.width, target.height, {
      fit: "cover",
      position: "centre",
      kernel: "lanczos3",
    });
    const info = await resized.webp({ quality: 92 }).toFile(masterPath);
    masterDimensions = { width: info.width, height: info.height };
    masterStatus = "upscaled-interpolated";
    console.warn("[warn] 8K master is Lanczos-interpolated, not authentic captured detail and not AI upscaling.");
  } else {
    if (upscale) masterStatus = "original-adequate";
    // Keep the lossless original as master; no unnecessary re-encode.
  }

  // 4. Responsive delivery derivatives (never upscaled).
  const derivatives: { file: string; width: number; height: number; bytes: number }[] = [];
  for (const width of DELIVERY_WIDTHS) {
    if (width > metadata.width) break; // avoid upscaling delivery sizes
    const file = id + "-w" + width + ".webp";
    const info = await sharp(input)
      .resize({ width })
      .webp({ quality: 82 })
      .toFile(path.join(HERO_DIR, file));
    derivatives.push({ file, width: info.width, height: info.height, bytes: info.size });
  }

  // 5. Manifest with the ACTUAL output dimensions.
  const manifest: HeroManifest = existsSync(MANIFEST_PATH)
    ? (JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as HeroManifest)
    : { images: [] };
  const entry = {
    id,
    original: "originals/" + path.basename(originalPath),
    originalDimensions: { width: metadata.width, height: metadata.height },
    master: "masters/" + path.basename(masterPath),
    masterDimensions,
    masterStatus,
    derivatives,
    focalPoint,
    fit,
    alt: options.alt || "",
    createdAt: new Date().toISOString(),
  };
  manifest.images = manifest.images.filter((existing) => existing.id !== id).concat(entry);
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

  // 6. Report.
  console.log("HERO IMAGE PROCESSED: " + id);
  console.log("  original: " + entry.original + " (" + metadata.width + "x" + metadata.height + ", " + orientation + ")");
  console.log("  master:   " + masterStatus + (masterStatus === "upscaled-interpolated" ? " (" + masterDimensions.width + "x" + masterDimensions.height + ")" : ""));
  for (const derivative of derivatives) {
    console.log("  derivative: " + derivative.file + " (" + derivative.width + "x" + derivative.height + ", " + derivative.bytes + " bytes)");
  }
  console.log("Add to src/lib/hero-image-library.ts:");
  console.log('  { id: "' + id + '", src: "/images/hero/' + (derivatives[derivatives.length - 1]?.file || id + ".webp") + '", alt: ' + JSON.stringify(options.alt || id) + (focalPoint ? ", focalPoint: { x: " + focalPoint.x + ", y: " + focalPoint.y + " }" : "") + ", fit: \"" + fit + "\" }");
  console.log("[note] Point src at the master or the largest derivative that suits production; derivatives are delivery-sized.");
}

processHeroImage().catch((error) => {
  console.error("hero:process failed: " + (error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
