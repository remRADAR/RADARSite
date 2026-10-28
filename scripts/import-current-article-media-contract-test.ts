import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  assertCurrentMediaInventory,
  buildBackupIndex,
  candidateCurrentMediaUrls,
  collectCurrentImageUrls,
  findBackupFile,
  isSafeCurrentMediaOrigin,
} from "./import-current-article-media";

async function main() {
  const featured = "https://radarcharts.net/wp-content/uploads/2026/09/featured.jpeg";
  const inline = "https://radarcharts.net/wp-content/uploads/2026/09/inline.jpeg";
  const markdown = "https://radarcharts.net/wp-content/uploads/2026/09/markdown.jpeg";
  const currentRecord = {
    sourceProvider: "radarcharts",
    featuredImage: featured,
    imageUrl: `//${featured.slice("https://".length)}`,
    bodyHtml: `<p><img src="${inline}" srcset="${inline.replace(".jpeg", "-300x.jpeg")} 300w" /></p>`,
    body: `![article image](${markdown})`,
  };
  assert.deepEqual(collectCurrentImageUrls(currentRecord), [featured, inline, markdown].sort(), "only source image URLs are inventoried; generated srcset sizes are omitted");

  const remoteCandidates = candidateCurrentMediaUrls(featured);
  assert.ok(remoteCandidates.length > 0, "current-domain media has an origin candidate");
  assert.ok(remoteCandidates.every((url) => url.includes("radarcharts.net") || url.startsWith("https://i0.wp.com/radarcharts.net/")), "remote candidates stay on the current origin or its Photon CDN");
  assert.deepEqual(candidateCurrentMediaUrls("https://remradar.wordpress.com/wp-content/uploads/2026/09/legacy.jpeg"), [], "legacy WordPress content is never used as a current-article fallback");
  assert.equal(isSafeCurrentMediaOrigin(featured), true, "current-domain image URLs are allowed");
  assert.equal(isSafeCurrentMediaOrigin("https://i0.wp.com/radarcharts.net/wp-content/uploads/2026/09/featured.jpeg"), true, "the current domain's Photon CDN is allowed");
  assert.equal(isSafeCurrentMediaOrigin("https://radarcharts.net:8443/wp-content/uploads/2026/09/featured.jpeg"), false, "nonstandard ports are rejected");
  assert.equal(isSafeCurrentMediaOrigin("https://remradar.wordpress.com/wp-content/uploads/2026/09/legacy.jpeg"), false, "legacy WordPress origins are rejected");
  assert.equal(isSafeCurrentMediaOrigin("https://i0.wp.com/other-site.example/wp-content/uploads/file.jpeg"), false, "Photon URLs for unrelated sites are rejected");
  assert.doesNotThrow(() => assertCurrentMediaInventory(1, 1));
  assert.throws(() => assertCurrentMediaInventory(0, 0), /No current RADARCharts CMS records/);
  assert.throws(() => assertCurrentMediaInventory(1, 0), /No current RADARCharts WordPress upload URLs/);

  const root = await mkdtemp(path.join(os.tmpdir(), "radarsite-media-import-test-"));
  try {
    const exactPath = path.join(root, "wp-content", "uploads", "2026", "09", "featured.jpeg");
    await mkdir(path.dirname(exactPath), { recursive: true });
    await writeFile(exactPath, "fixture");
    const index = await buildBackupIndex(root);
    assert.equal(findBackupFile(featured, index, root), exactPath, "matching preserved WordPress upload paths are preferred");

    const flatRoot = path.join(root, "flat");
    const flatPath = path.join(flatRoot, "featured.jpeg");
    await mkdir(flatRoot, { recursive: true });
    await writeFile(flatPath, "fixture");
    const flatIndex = await buildBackupIndex(flatRoot);
    assert.equal(findBackupFile(featured, flatIndex, flatRoot), undefined, "flat filename matching is disabled by default");
    assert.equal(findBackupFile(featured, flatIndex, flatRoot, true), flatPath, "flat filename matching requires explicit opt-in and a unique basename");

    const ambiguousRoot = path.join(root, "ambiguous");
    await mkdir(path.join(ambiguousRoot, "a"), { recursive: true });
    await mkdir(path.join(ambiguousRoot, "b"), { recursive: true });
    await writeFile(path.join(ambiguousRoot, "a", "featured.jpeg"), "a");
    await writeFile(path.join(ambiguousRoot, "b", "featured.jpeg"), "b");
    const ambiguousIndex = await buildBackupIndex(ambiguousRoot);
    assert.equal(findBackupFile(featured, ambiguousIndex, ambiguousRoot, true), undefined, "ambiguous flat matches are rejected even with opt-in");
  } finally {
    await rm(root, { recursive: true, force: true });
  }

  console.log("Current media importer contract passed: exact source URLs, safe fetch origins, and conservative backup matching.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
