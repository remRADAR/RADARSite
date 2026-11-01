import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mergedContentSnapshot from "../src/data/merged-content.json";
import { checksumSha256, createWebpDerivatives, mediaStorageConfig, putMediaObject } from "../src/lib/media-storage";
import { normalizeCurrentMediaUrl } from "../src/lib/current-media-map";

type SnapshotRecord = {
  sourceProvider?: unknown;
  status?: unknown;
  featuredImage?: unknown;
  imageUrl?: unknown;
  socialImage?: unknown;
  bodyHtml?: unknown;
  body?: unknown;
};

export type BackupIndex = { byRelativePath: Map<string, string>; byBasename: Map<string, string[]> };
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const backupDirArg = args.find((arg) => arg.startsWith("--backup-dir="))?.slice("--backup-dir=".length);
const backupRoot = backupDirArg ? path.resolve(backupDirArg) : "";
const allowFlatBackupMatch = args.includes("--allow-flat-backup-match");

function uploadPath(url: string): string | undefined {
  try {
    const pathname = new URL(url).pathname;
    const index = pathname.toLowerCase().indexOf("/wp-content/uploads/");
    return index >= 0 ? decodeURIComponent(pathname.slice(index + "/wp-content/uploads/".length)) : undefined;
  } catch {
    return undefined;
  }
}

function isCurrentWordPressAsset(value: string): boolean {
  const key = normalizeCurrentMediaUrl(value);
  return Boolean(uploadPath(key));
}

export function isSafeCurrentMediaOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || (url.port && url.port !== "443")) return false;
    const host = url.hostname.toLowerCase();
    const isCurrentOrigin = host === "radarcharts.net" || host === "www.radarcharts.net";
    const isCurrentPhoton = /^i[0-3]\.wp\.com$/.test(host) && url.pathname.startsWith("/radarcharts.net/");
    return (isCurrentOrigin || isCurrentPhoton) && Boolean(uploadPath(normalizeCurrentMediaUrl(value)));
  } catch {
    return false;
  }
}

export function candidateCurrentMediaUrls(value: string): string[] {
  try {
    const original = new URL(value);
    if (!isSafeCurrentMediaOrigin(value)) return [];

    const canonical = normalizeCurrentMediaUrl(value);
    const canonicalUrl = new URL(canonical);
    if (canonicalUrl.hostname !== "radarcharts.net" || !uploadPath(canonical)) return [];
    const pathname = canonicalUrl.pathname;
    const originalWithoutQuery = `https://${original.hostname}${original.pathname}`;
    return [...new Set([originalWithoutQuery, canonical, `https://i0.wp.com/radarcharts.net${pathname}`])];
  } catch {
    return [];
  }
}

export function collectCurrentImageUrls(record: SnapshotRecord): string[] {
  const found = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value !== "string") return;
    const rawCandidate = value.trim().replaceAll("&amp;", "&");
    const candidate = rawCandidate.startsWith("//") ? `https:${rawCandidate}` : rawCandidate;
    if (/^https?:\/\//i.test(candidate) && isCurrentWordPressAsset(candidate)) found.add(normalizeCurrentMediaUrl(candidate));
  };

  add(record.featuredImage);
  add(record.imageUrl);
  add(record.socialImage);
  for (const html of [record.bodyHtml, record.body]) {
    if (typeof html !== "string") continue;
    for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
      // Import source images only. The sanitizer discards WordPress srcset
      // thumbnails, and those generated size variants need not be migrated.
      for (const attribute of tag[0].matchAll(/\b(?:src|data-src|data-lazy-src|data-original|data-orig-file|data-large-file)\s*=\s*(["'])(.*?)\1/gi)) {
        const raw = attribute[2];
        for (const item of raw.split(",")) {
          const candidate = item.trim().split(/\s+/)[0];
          add(candidate.startsWith("//") ? `https:${candidate}` : candidate);
        }
      }
    }
    for (const markdownImage of html.matchAll(/!\[[^\]]*\]\(\s*<?(https?:\/\/[^)\s>]+)/gi)) add(markdownImage[1]);
  }
  return [...found].sort();
}

export async function buildBackupIndex(root: string): Promise<BackupIndex> {
  const byRelativePath = new Map<string, string>();
  const byBasename = new Map<string, string[]>();
  if (!root) return { byRelativePath, byBasename };

  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(fullPath);
      else if (entry.isFile()) {
        const relative = path.relative(root, fullPath).split(path.sep).join("/");
        byRelativePath.set(relative.toLowerCase(), fullPath);
        const basename = path.basename(fullPath).toLowerCase();
        byBasename.set(basename, [...(byBasename.get(basename) || []), fullPath]);
      }
    }
  }

  await walk(root);
  return { byRelativePath, byBasename };
}

export function findBackupFile(url: string, index: BackupIndex, root: string, allowFlatMatch = false): string | undefined {
  const relativeUploadPath = uploadPath(url);
  if (!relativeUploadPath || !root) return undefined;
  const normalizedRelative = relativeUploadPath.split(path.sep).join("/").toLowerCase();
  const exact = index.byRelativePath.get(normalizedRelative) || index.byRelativePath.get(`wp-content/uploads/${normalizedRelative}`);
  if (exact) return exact;
  if (!allowFlatMatch) return undefined;
  const basename = path.posix.basename(normalizedRelative);
  const matches = index.byBasename.get(basename) || [];
  return matches.length === 1 ? matches[0] : undefined;
}

async function fetchOriginal(url: string): Promise<Buffer | undefined> {
  for (const candidate of candidateCurrentMediaUrls(url)) {
    try {
      const response = await fetch(candidate, { signal: AbortSignal.timeout(12_000), headers: { "user-agent": "RADARSite-current-media-migration/1.0" } });
      if (!response.ok || !isSafeCurrentMediaOrigin(response.url)) continue;
      const length = Number(response.headers.get("content-length") || 0);
      if (length > MAX_IMAGE_BYTES) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.byteLength > MAX_IMAGE_BYTES) continue;
      const type = response.headers.get("content-type") || "";
      if (!type.toLowerCase().startsWith("image/")) continue;
      return bytes;
    } catch {
      // A later allowed origin may still have a recoverable copy.
    }
  }
  return undefined;
}

export function assertCurrentMediaInventory(recordCount: number, assetCount: number): void {
  if (recordCount <= 0) throw new Error("No current RADARCharts CMS records found; refusing to run a no-op import.");
  if (assetCount <= 0) throw new Error("No current RADARCharts WordPress upload URLs found; refusing to run a no-op import.");
}

async function main() {
  const articles = (mergedContentSnapshot as { articles?: SnapshotRecord[] }).articles || [];
  const currentRecords = articles.filter((record) => record.sourceProvider === "radarcharts" && record.status !== "draft" && record.status !== "archived");
  const assets = [...new Set(currentRecords.flatMap(collectCurrentImageUrls))].sort();
  assertCurrentMediaInventory(currentRecords.length, assets.length);
  const backupIndex = await buildBackupIndex(backupRoot);
  const existingMapPath = path.resolve(process.cwd(), "src/data/current-media-map.json");
  const existingMap = JSON.parse(await readFile(existingMapPath, "utf8")) as Record<string, string>;
  const resolvedMap: Record<string, string> = { ...existingMap };
  const missing: string[] = [];
  let availableInBackup = 0;
  let imported = 0;

  if (!dryRun) {
    const config = mediaStorageConfig();
    if (!config.publicBaseUrl) throw new Error("R2_PUBLIC_BASE_URL must be configured before media can be published.");
  }
  if (allowFlatBackupMatch) console.warn("WARNING: flat backup filename matching is enabled; use only with a verified current-CMS backup.");

  for (const sourceUrl of assets) {
    const backupFile = findBackupFile(sourceUrl, backupIndex, backupRoot, allowFlatBackupMatch);
    if (dryRun) {
      if (backupFile) availableInBackup++;
      else missing.push(sourceUrl);
      continue;
    }

    const sourceBytes = backupFile ? await readFile(backupFile) : await fetchOriginal(sourceUrl);
    if (!sourceBytes) {
      missing.push(sourceUrl);
      console.error(`MISSING ${sourceUrl}`);
      continue;
    }
    if (backupFile) availableInBackup++;

    try {
      const sourceSha = checksumSha256(sourceBytes);
      const derivatives = await createWebpDerivatives({ source: sourceBytes, keyPrefix: `current/webp/${sourceSha}` });
      const largest = derivatives.derivatives[0];
      if (!largest) throw new Error("No WebP derivative was produced.");
      const stored = await putMediaObject({
        key: largest.key,
        body: largest.body,
        contentType: largest.contentType,
        metadata: { sourceSha256: sourceSha, originalUrlSha256: createHash("sha256").update(sourceUrl).digest("hex") },
      });
      resolvedMap[normalizeCurrentMediaUrl(sourceUrl)] = stored.url;
      imported++;
      console.log(`IMPORTED ${sourceUrl} -> ${largest.key}`);
    } catch (error) {
      missing.push(sourceUrl);
      console.error(`FAILED ${sourceUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!dryRun && imported > 0) {
    const ordered = Object.fromEntries(Object.entries(resolvedMap).sort(([a], [b]) => a.localeCompare(b)));
    await writeFile(existingMapPath, `${JSON.stringify(ordered, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify({ mode: dryRun ? "dry-run" : "import", currentRecords: currentRecords.length, assets: assets.length, availableInBackup, imported, missing: missing.length, allowFlatBackupMatch, mapPath: dryRun ? undefined : existingMapPath }, null, 2));
  if (missing.length) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
