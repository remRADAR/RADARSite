#!/usr/bin/env node
/**
 * Generate pre-resized 1200x630 social-card derivatives for every published
 * article's artwork.
 *
 * Why this exists
 * ---------------
 * /api/social-card/[slug] renders a 1200x630 PNG with satori + resvg. The
 * artwork it embeds is the article's full-size source image, which is routinely
 * 3000-6000px wide and up to ~1.1 MB. Decoding and downscaling that inside the
 * Worker on a cold render blows the Cloudflare CPU budget (error 1102 -> 503).
 *
 * The fix is to stop asking the Worker to do the resize. This script produces a
 * 1200x630 WebP derivative per article, committed under public/social/cards/,
 * which the route prefers over the full-size source. A 1200x630 WebP is a few
 * tens of KB, so the cold render decodes almost nothing.
 *
 * Output
 * ------
 *   public/social/cards/<slug>.webp   (1200x630, cover-cropped, quality 82)
 *   public/social/cards/manifest.json (slug -> { file, source, bytes })
 *
 * The manifest is what the route reads. It is generated, not hand-edited.
 *
 * Usage
 * -----
 *   node scripts/generate-social-card-derivatives.mjs            # all published
 *   node scripts/generate-social-card-derivatives.mjs --limit 5  # smoke test
 *   node scripts/generate-social-card-derivatives.mjs --only <slug>
 *   node scripts/generate-social-card-derivatives.mjs --force    # redo existing
 */

import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "social", "cards");
const MANIFEST = path.join(OUT_DIR, "manifest.json");
const ROUTE_MANIFEST = path.join(ROOT, "src", "data", "social-card-manifest.json");
const CONTENT = path.join(ROOT, "src", "data", "merged-content.json");

const CARD_W = 1200;
const CARD_H = 630;
const QUALITY = 82;
const CONCURRENCY = 3;
const FETCH_TIMEOUT_MS = 20000;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const LIMIT = value("--limit") ? Number(value("--limit")) : Infinity;
const ONLY = value("--only");
const FORCE = flag("--force");

const exists = async (p) => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch with a hard timeout and bounded retry.
 *
 * The R2 bucket behind the legacy artwork returns transient 503s when several
 * requests land at once, so a single attempt would leave holes in the manifest
 * for images that are perfectly fine. 404 is NOT retried: it means the source
 * genuinely is not there, and the route's own fallback covers that case.
 */
async function fetchBuffer(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      if (res.status === 404) throw new Error("HTTP 404");
      lastError = new Error(`HTTP ${res.status}`);
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.message === "HTTP 404") throw error;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < attempts) await sleep(400 * 2 ** (attempt - 1));
  }
  throw lastError;
}

async function buildOne(article) {
  const slug = article.slug;
  const source = article.imageUrl || article.featuredImage;
  const outFile = path.join(OUT_DIR, `${slug}.webp`);

  if (!source) return { slug, status: "skipped", reason: "no image" };
  if (!FORCE && (await exists(outFile))) {
    const bytes = (await readFile(outFile)).length;
    return { slug, status: "cached", file: `${slug}.webp`, source, bytes };
  }

  const input = await fetchBuffer(source);
  const out = await sharp(input)
    .resize(CARD_W, CARD_H, { fit: "cover", position: "attention" })
    .webp({ quality: QUALITY, effort: 4 })
    .toBuffer();

  await writeFile(outFile, out);
  return {
    slug,
    status: "built",
    file: `${slug}.webp`,
    source,
    sourceBytes: input.length,
    bytes: out.length,
  };
}

/** Run tasks with a bounded pool so we do not open 342 sockets at once. */
async function pool(items, worker, size) {
  const results = [];
  let cursor = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = await worker(items[index]);
      } catch (error) {
        results[index] = {
          slug: items[index].slug,
          status: "failed",
          reason: error instanceof Error ? error.message : String(error),
        };
      }
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * Load the article list.
 *
 * The committed snapshot (src/data/merged-content.json) is a build-time
 * fallback and lags production: it is missing recently published articles, and
 * those are exactly the ones whose cards get shared first. Production reads the
 * live content store, so this script does too, falling back to the snapshot when
 * the store is unreachable (offline run, or the bucket is not public).
 */
async function loadArticles() {
  const LIVE_URL =
    process.env.RADAR_CONTENT_STORE_URL ||
    "https://pub-2d7f41f7140544c480801d8b90da765e.r2.dev/content/radarsite-content-v1.json";

  try {
    const raw = await fetchBuffer(LIVE_URL, 3);
    const state = JSON.parse(raw.toString("utf8"));
    const articles = state?.content?.articles;
    if (Array.isArray(articles) && articles.length) {
      console.log(`source: live content store (${articles.length} articles)`);
      return articles;
    }
    throw new Error("live store returned no articles");
  } catch (error) {
    console.warn(
      `live content store unavailable (${error instanceof Error ? error.message : error}); ` +
        "falling back to committed snapshot",
    );
    const content = JSON.parse(await readFile(CONTENT, "utf8"));
    console.log(`source: committed snapshot (${(content.articles || []).length} articles)`);
    return content.articles || [];
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const all = await loadArticles();
  let articles = all.filter(
    (a) => a && a.slug && a.status !== "draft" && a.status !== "archived",
  );
  if (ONLY) articles = articles.filter((a) => a.slug === ONLY);
  if (Number.isFinite(LIMIT)) articles = articles.slice(0, LIMIT);

  console.log(`Generating ${CARD_W}x${CARD_H} derivatives for ${articles.length} article(s)...`);

  const results = await pool(articles, buildOne, CONCURRENCY);

  // Merge into the existing manifest so a --limit / --only run does not drop
  // entries that were generated by an earlier full run.
  let previous = {};
  if (await exists(MANIFEST)) {
    try {
      previous = JSON.parse(await readFile(MANIFEST, "utf8")).cards || {};
    } catch {
      previous = {};
    }
  }

  const cards = { ...previous };
  for (const r of results) {
    if (r.status === "built" || r.status === "cached") {
      cards[r.slug] = { file: r.file, source: r.source, bytes: r.bytes };
    }
  }

  const built = results.filter((r) => r.status === "built");
  const cached = results.filter((r) => r.status === "cached");
  const failed = results.filter((r) => r.status === "failed");
  const skipped = results.filter((r) => r.status === "skipped");

  const manifestBody =
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        width: CARD_W,
        height: CARD_H,
        format: "webp",
        count: Object.keys(cards).length,
        cards,
      },
      null,
      2,
    ) + "\n";

  // Two copies on purpose:
  //   public/social/cards/manifest.json  -> served as a static asset, and the
  //                                         human-readable record of what exists
  //   src/data/social-card-manifest.json -> imported by the route at build time,
  //                                         so the lookup is a bundled object
  //                                         rather than a runtime fetch
  await writeFile(MANIFEST, manifestBody);
  await writeFile(ROUTE_MANIFEST, manifestBody);

  const totalBytes = built.reduce((n, r) => n + (r.bytes || 0), 0);
  const totalSource = built.reduce((n, r) => n + (r.sourceBytes || 0), 0);

  console.log(`\nbuilt:   ${built.length}`);
  console.log(`cached:  ${cached.length}`);
  console.log(`skipped: ${skipped.length}`);
  console.log(`failed:  ${failed.length}`);
  if (built.length) {
    console.log(
      `\noutput:  ${(totalBytes / 1024).toFixed(0)} KB total, ` +
        `${(totalBytes / built.length / 1024).toFixed(1)} KB avg`,
    );
    console.log(
      `source:  ${(totalSource / 1024 / 1024).toFixed(1)} MB total, ` +
        `${(totalSource / built.length / 1024).toFixed(0)} KB avg ` +
        `(${(totalSource / Math.max(totalBytes, 1)).toFixed(1)}^ reduction)`,
    );
  }
  console.log(`manifest: ${Object.keys(cards).length} entries`);

  if (failed.length) {
    console.log("\nfailures:");
    for (const f of failed) console.log(`  ${f.slug}: ${f.reason}`);
  }

  // Non-zero exit only when nothing at all succeeded, so a handful of dead
  // legacy URLs do not fail the build.
  if (built.length === 0 && cached.length === 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
