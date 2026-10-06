import currentMediaAudit from "../../current-article-media-audit.json";
import currentMediaBytes from "../../current-article-media-byte-verification.json";
import { revalidatePath, revalidateTag } from "next/cache";
import { createMediaRelationshipId } from "@/lib/media-relationships";
import { readContent, writeContent, upsertMediaRecord, upsertMediaRelationship, hasContentDatabase, contentCacheTag, type CmsRecord } from "@/lib/content-server";
import { checksumSha256, createWebpDerivatives, headMediaObject, mediaStorageConfig, putMediaObject, readMediaObjectBytes } from "@/lib/media-storage";

const MIGRATION_VERSION = "current-media-v1";
const SOURCE_PROVIDER = "radarcharts";
const MAX_BATCH = 10;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

type AuditAsset = {
  sourceUrl: string;
  attachmentId: number;
  roles: string[];
  articles: number[];
  mimeType?: string;
  filename?: string;
  width?: number;
  height?: number;
  verifiedByteSize?: number;
  verifiedSha256?: string;
  verifiedMimeType?: string;
};
type AuditArticle = {
  articleId: number;
  slug: string;
  featuredMediaId?: number;
  featuredImage?: { sourceUrl?: string; canonicalSourceUrl?: string; attachmentId?: number };
  inlineImages?: Array<{ attachmentId?: number; sourceUrl?: string; canonicalSourceUrl?: string; srcset?: string }>;
};
type ByteRecord = { attachmentId: number; url: string; status: number; contentType?: string; bytes: number; sha256: string };
type StoredAsset = { asset: AuditAsset; keyPrefix: string; primaryKey: string; primaryUrl: string; sourceSha256: string; sourceBytes: number; derivatives: Array<{ key: string; url: string; sha256: string; bytes: number; width: number; height?: number }> };

const audit = currentMediaAudit as { summary: { currentArticles: number; uniqueImageAssets: number }; articles: AuditArticle[]; assets: AuditAsset[] };
const bytesManifest = currentMediaBytes as { records: ByteRecord[] };
const auditAssets = new Map(audit.assets.map((asset) => [asset.attachmentId, asset]));
const byteRecords = new Map(bytesManifest.records.map((record) => [record.attachmentId, record]));

export function currentMediaMigrationInfo() {
  return { version: MIGRATION_VERSION, sourceProvider: SOURCE_PROVIDER, articles: audit.summary.currentArticles, assets: audit.summary.uniqueImageAssets, maxBatch: MAX_BATCH, databaseConfigured: hasContentDatabase(), storageConfigured: Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY), sourceAuthConfigured: Boolean(process.env.WORDPRESS_MEDIA_AUTHORIZATION) };
}

function requireAuditAsset(id: number) {
  const asset = auditAssets.get(id);
  const expected = byteRecords.get(id);
  if (!asset || !expected || !asset.sourceUrl || !asset.verifiedSha256) throw new Error(`AUDIT_ASSET_NOT_VERIFIED:${id}`);
  if (expected.sha256 !== asset.verifiedSha256 || expected.bytes !== asset.verifiedByteSize || expected.status !== 200) throw new Error(`AUDIT_BYTE_MANIFEST_CONFLICT:${id}`);
  return { asset, expected };
}

function keyPrefix(asset: AuditAsset) { return `current-media/attachment-${asset.attachmentId}`; }
function contentKey(articleId: number) { return `${SOURCE_PROVIDER}:${articleId}`; }
function mediaId(attachmentId: number) { return `media:${SOURCE_PROVIDER}:${attachmentId}`; }
function safeFilename(asset: AuditAsset) { return (asset.filename || `attachment-${asset.attachmentId}`).replace(/[^a-zA-Z0-9._/-]/g, "_").slice(-240); }
function nearestDerivative(width: number | undefined, widths: number[]) { const requested = width || Math.max(...widths); return widths.reduce((best, candidate) => Math.abs(candidate - requested) < Math.abs(best - requested) ? candidate : best, widths[0]); }
function parseWidth(url: string) { const match = url.match(/-(\d+)x\d+(?=\.[a-z0-9]+(?:\?|$))/i); return match ? Number(match[1]) : undefined; }
function rewriteUrl(value: string, asset: AuditAsset, derivatives: StoredAsset["derivatives"]) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const sourcePath = new URL(asset.sourceUrl).pathname;
  const sourceName = sourcePath.split("/").pop() || "";
  const sourceStem = sourceName.replace(/\.[^.]+$/, "").replace(/-\d+x\d+$/, "");
  const candidateName = (() => { try { return new URL(trimmed).pathname.split("/").pop() || ""; } catch { return trimmed.split("/").pop() || ""; } })();
  const candidateStem = candidateName.replace(/\.[^.]+$/, "").replace(/-\d+x\d+$/, "").replace(/-scaled$/, "");
  const known = trimmed === asset.sourceUrl || trimmed.includes(sourcePath) || candidateStem === sourceStem;
  if (!known) return value;
  const width = nearestDerivative(parseWidth(trimmed), derivatives.map((item) => item.width));
  return derivatives.find((item) => item.width === width)?.url || derivatives[derivatives.length - 1].url;
}
function rewriteHtml(html: string, asset: AuditAsset, derivatives: StoredAsset["derivatives"]) {
  let result = html;
  result = result.split(asset.sourceUrl).join(rewriteUrl(asset.sourceUrl, asset, derivatives));
  return result.replace(/(https:\/\/radarcharts\.net\/wp-content\/uploads\/[^\s"'<>]+)/g, (url) => rewriteUrl(url, asset, derivatives));
}

async function fetchSource(asset: AuditAsset, expected: ByteRecord) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const headers: Record<string, string> = { accept: "image/avif,image/webp,image/jpeg,image/png;q=0.9,*/*;q=0.1" };
    if (process.env.WORDPRESS_MEDIA_AUTHORIZATION) headers.authorization = process.env.WORDPRESS_MEDIA_AUTHORIZATION;
    const response = await fetch(asset.sourceUrl, { headers, cache: "no-store", redirect: "follow", signal: controller.signal });
    if (!response.ok) throw new Error(`SOURCE_HTTP_${response.status}:${asset.attachmentId}`);
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_SOURCE_BYTES) throw new Error(`SOURCE_TOO_LARGE:${asset.attachmentId}`);
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length > MAX_SOURCE_BYTES || body.length !== expected.bytes || checksumSha256(body) !== expected.sha256) throw new Error(`SOURCE_CHECKSUM_MISMATCH:${asset.attachmentId}`);
    const contentType = (response.headers.get("content-type") || asset.verifiedMimeType || asset.mimeType || "application/octet-stream").split(";")[0].toLowerCase();
    if (!contentType.startsWith("image/")) throw new Error(`SOURCE_NOT_IMAGE:${asset.attachmentId}`);
    return { body, contentType };
  } finally { clearTimeout(timeout); }
}

async function prepareAsset(asset: AuditAsset): Promise<StoredAsset> {
  const { expected } = requireAuditAsset(asset.attachmentId);
  const source = await fetchSource(asset, expected);
  const conversion = await createWebpDerivatives({ source: source.body, keyPrefix: keyPrefix(asset), quality: 82 });
  const derivatives: StoredAsset["derivatives"] = [];
  for (const derivative of conversion.derivatives) {
    const checksum = checksumSha256(derivative.body);
    const stored = await putMediaObject({ key: derivative.key, body: derivative.body, contentType: derivative.contentType, cacheControl: "public, max-age=31536000, immutable", metadata: { migration_version: MIGRATION_VERSION, source_provider: SOURCE_PROVIDER, source_attachment_id: String(asset.attachmentId), source_sha256: expected.sha256, derivative_sha256: checksum } });
    const downloaded = await readMediaObjectBytes(derivative.key);
    if (downloaded.length !== derivative.body.length || checksumSha256(downloaded) !== checksum) throw new Error(`R2_VERIFY_FAILED:${asset.attachmentId}:${derivative.width}`);
    derivatives.push({ key: derivative.key, url: stored.url, sha256: checksum, bytes: derivative.body.length, width: derivative.width, height: derivative.height });
  }
  const primary = derivatives[0];
  return { asset, keyPrefix: keyPrefix(asset), primaryKey: primary.key, primaryUrl: primary.url, sourceSha256: expected.sha256, sourceBytes: expected.bytes, derivatives };
}

export async function migrateCurrentMediaBatch(input: { mode: "dry-run" | "upload" | "rewrite"; offset?: number; limit?: number; runId: string; confirmation?: string }) {
  const offset = Math.max(0, Math.floor(input.offset || 0));
  const limit = Math.min(MAX_BATCH, Math.max(1, Math.floor(input.limit || MAX_BATCH)));
  if (!input.runId || !/^[a-zA-Z0-9._:-]{8,100}$/.test(input.runId)) throw new Error("VALID_RUN_ID_REQUIRED");
  if (input.mode !== "dry-run" && input.confirmation !== "current-media-r2-apply-v1") throw new Error("EXPLICIT_APPLY_CONFIRMATION_REQUIRED");
  if (input.mode === "rewrite" && !hasContentDatabase()) throw new Error("DATABASE_URL_REQUIRED_FOR_REWRITE");
  const batch = audit.assets.slice(offset, offset + limit);
  const results: Array<Record<string, unknown>> = [];
  const prepared: StoredAsset[] = [];
  for (const asset of batch) {
    try {
      if (input.mode === "dry-run") {
        const { expected } = requireAuditAsset(asset.attachmentId);
        const source = await fetchSource(asset, expected);
        const conversion = await createWebpDerivatives({ source: source.body, keyPrefix: keyPrefix(asset), quality: 82 });
        results.push({ attachmentId: asset.attachmentId, status: "verified", sourceBytes: source.body.length, sourceSha256: checksumSha256(source.body), derivatives: conversion.derivatives.map((item) => ({ width: item.width, height: item.height, bytes: item.body.length, sha256: checksumSha256(item.body) })) });
        continue;
      }
      const stored = input.mode === "upload" ? await prepareAsset(asset) : await existingStoredAsset(asset);
      prepared.push(stored);
      results.push({ attachmentId: asset.attachmentId, status: "r2-verified", primaryUrl: stored.primaryUrl, derivativeCount: stored.derivatives.length });
    } catch (error) {
      results.push({ attachmentId: asset.attachmentId, status: "failed", error: error instanceof Error ? error.message : String(error) });
      if (input.mode !== "dry-run") throw error;
    }
  }
  if (input.mode === "upload" || input.mode === "rewrite") {
    for (const stored of prepared) await persistAsset(stored, input.runId);
  }
  if (input.mode === "rewrite") {
    const rewritten = await rewriteBatch(prepared, input.runId);
    results.push({ rewrite: rewritten });
    revalidateTag(contentCacheTag(), { expire: 0 });
    revalidatePath("/", "layout");
  }
  return { ok: results.every((item) => item.status !== "failed"), mode: input.mode, runId: input.runId, offset, limit, processed: batch.length, totalAssets: audit.assets.length, nextOffset: offset + batch.length < audit.assets.length ? offset + batch.length : null, results };
}

async function existingStoredAsset(asset: AuditAsset): Promise<StoredAsset> {
  const prefix = keyPrefix(asset);
  const widths = [2400, 1600, 960, 480];
  const derivatives: StoredAsset["derivatives"] = [];
  for (const width of widths) {
    const key = `${prefix}/w-${width}.webp`;
    try { const head = await headMediaObject(key); derivatives.push({ key, url: head.url, sha256: head.metadata.derivative_sha256 || "", bytes: head.size, width }); } catch { /* smaller source images may not have every width */ }
  }
  if (!derivatives.length) throw new Error(`R2_OBJECTS_NOT_FOUND:${asset.attachmentId}`);
  return { asset, keyPrefix: prefix, primaryKey: derivatives[0].key, primaryUrl: derivatives[0].url, sourceSha256: asset.verifiedSha256 || "", sourceBytes: asset.verifiedByteSize || 0, derivatives };
}

async function persistAsset(stored: StoredAsset, runId: string) {
  const asset = stored.asset;
  await upsertMediaRecord({ id: mediaId(asset.attachmentId), sourceProvider: SOURCE_PROVIDER, sourceUrl: asset.sourceUrl, sourceId: String(asset.attachmentId), originalFilename: safeFilename(asset), mimeType: "image/webp", fileSize: stored.derivatives[0].bytes, width: asset.width, height: asset.height, storageProvider: "r2", storageBucket: mediaStorageConfig().bucket, storageKey: stored.primaryKey, deliveryUrl: stored.primaryUrl, checksum: stored.derivatives[0].sha256, migrationStatus: "migrated", provenance: { migrationVersion: MIGRATION_VERSION, runId, sourceSha256: stored.sourceSha256, sourceBytes: stored.sourceBytes, derivativeKeys: stored.derivatives.map((item) => item.key) } });
  for (const article of audit.articles.filter((item) => item.featuredMediaId === asset.attachmentId || (item.inlineImages || []).some((image) => image.attachmentId === asset.attachmentId))) {
    const articleKey = contentKey(article.articleId);
    if (article.featuredMediaId === asset.attachmentId) await upsertMediaRelationship({ id: createMediaRelationshipId({ mediaId: mediaId(asset.attachmentId), contentKey: articleKey, role: "featured" }), mediaId: mediaId(asset.attachmentId), contentKey: articleKey, contentSourceProvider: SOURCE_PROVIDER, contentSourceId: String(article.articleId), role: "featured", sourceLocator: `attachment:${asset.attachmentId}`, migrationRunId: runId, provenance: { migrationVersion: MIGRATION_VERSION } });
    for (let placement = 0; placement < (article.inlineImages || []).length; placement++) {
      const inline = (article.inlineImages || [])[placement];
      if (!inline) continue;
      if (inline.attachmentId !== asset.attachmentId) continue;
      await upsertMediaRelationship({ id: createMediaRelationshipId({ mediaId: mediaId(asset.attachmentId), contentKey: articleKey, role: "inline", placementIndex: placement }), mediaId: mediaId(asset.attachmentId), contentKey: articleKey, contentSourceProvider: SOURCE_PROVIDER, contentSourceId: String(article.articleId), role: "inline", placementIndex: placement, sourceLocator: `attachment:${asset.attachmentId}:inline:${placement}`, migrationRunId: runId, provenance: { migrationVersion: MIGRATION_VERSION } });
    }
  }
}

async function rewriteBatch(prepared: StoredAsset[], runId: string) {
  const content = await readContent();
  let updated = 0;
  const ids = new Set(prepared.map((item) => item.asset.attachmentId));
  const byId = new Map(prepared.map((item) => [item.asset.attachmentId, item]));
  const nextArticles = content.articles.map((item) => {
    const record = item as CmsRecord;
    const article = audit.articles.find((entry) => String(entry.articleId) === String(record.sourceId) && record.sourceProvider === SOURCE_PROVIDER);
    if (!article) return item;
    const replacements = (article.featuredMediaId ? [article.featuredMediaId] : []).concat((article.inlineImages || []).map((image) => image.attachmentId || 0)).filter((id) => ids.has(id));
    if (!replacements.length) return item;
    let next = { ...record };
    for (const id of new Set(replacements)) {
      const stored = byId.get(id); if (!stored) continue;
      next = { ...next, featuredImage: article.featuredMediaId === id ? stored.primaryUrl : next.featuredImage, imageUrl: article.featuredMediaId === id ? stored.primaryUrl : next.imageUrl, bodyHtml: rewriteHtml(next.bodyHtml || "", stored.asset, stored.derivatives) };
    }
    next.migrationWarnings = [...new Set([...(next.migrationWarnings || []), `Current media migrated via ${MIGRATION_VERSION} run ${runId}.`])];
    updated++;
    return next;
  });
  await writeContent({ ...content, articles: nextArticles });
  return { updatedArticles: updated, preparedAssets: prepared.length, runId };
}
