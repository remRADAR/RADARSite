import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpsRequest } from "node:https";
import { createHash } from "node:crypto";
import { checksumSha256, headMediaObject, mediaStorageConfig, mediaStorageDiagnostics, putMediaObject, validateMediaDeliveryUrl } from "@/lib/media-storage";
import { upsertMediaRecord, type ContentMediaRecord } from "@/lib/content-server";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_FORMATS: Record<string, { mime: string; extension: string }> = {
  jpeg: { mime: "image/jpeg", extension: "jpg" },
  png: { mime: "image/png", extension: "png" },
  webp: { mime: "image/webp", extension: "webp" },
  gif: { mime: "image/gif", extension: "gif" },
  avif: { mime: "image/avif", extension: "avif" },
};

type ResolvedAddress = { address: string; family: number };
function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const octets = address.split(".").map(Number);
    const [a, b] = octets;
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 168 || b === 88)) || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0));
  }
  if (family === 6) {
    const normalized = address.toLowerCase();
    if (normalized.startsWith("::ffff:")) return false;
    // Only globally routable unicast (2000::/3) is accepted. This excludes
    // unspecified, loopback, link-local, unique-local, multicast and mapped IPs.
    const first = parseInt(normalized.split(":")[0] || "0", 16);
    return (first & 0xe000) === 0x2000;
  }
  return false;
}

export function validateNotionImageUrl(input: string): URL {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Featured or inline image URL is malformed."); }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname || (url.port && url.port !== "443")) throw new Error("Images must use public HTTPS URLs on the standard port.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "metadata.google.internal" || isIP(host)) throw new Error("Image URL hostname is not permitted.");
  return url;
}

export function notionAssetKey(checksum: string, extension: string): string {
  if (!/^[a-f0-9]{64}$/.test(checksum) || !Object.values(ALLOWED_FORMATS).some((format) => format.extension === extension)) throw new Error("Notion media identity is invalid.");
  return `notion/assets/${checksum.slice(0, 2)}/${checksum}.${extension}`;
}

const NOTION_WEBP_CONVERSION = "webp-q80-max2400-v1";
type NotionWebpConversion = { body: Buffer; checksum: string; sourceChecksum: string; sourceMimeType: string; sourceBytes: number; width?: number; height?: number };

export async function convertNotionImageToWebp(input: { bytes: Buffer; contentType: string }): Promise<NotionWebpConversion> {
  const { default: sharp } = await import("sharp");
  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try { metadata = await sharp(input.bytes, { failOn: "warning", limitInputPixels: 100_000_000 }).metadata(); }
  catch { throw new Error("Image content is invalid or unsupported."); }
  const format = metadata.format ? ALLOWED_FORMATS[metadata.format] : undefined;
  if (!format || (input.contentType && input.contentType !== format.mime && input.contentType !== "application/octet-stream")) throw new Error("Image format is unsupported or does not match its media type.");

  const body = await sharp(input.bytes, { failOn: "warning", limitInputPixels: 100_000_000, animated: (metadata.pages || 1) > 1 })
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, effort: 6, smartSubsample: true })
    .toBuffer();
  const outputMetadata = await sharp(body, { failOn: "warning" }).metadata();
  if (outputMetadata.format !== "webp") throw new Error("Converted image is not WebP.");
  return {
    body,
    checksum: checksumSha256(body),
    sourceChecksum: checksumSha256(input.bytes),
    sourceMimeType: format.mime,
    sourceBytes: input.bytes.byteLength,
    width: outputMetadata.width,
    height: outputMetadata.height,
  };
}

export function notionR2ConfigurationReady(): boolean {
  try {
    const config = mediaStorageConfig();
    const diagnostics = mediaStorageDiagnostics();
    if (!diagnostics.accountIdFormatValid || !diagnostics.bucketMatchesTarget || !diagnostics.credentialsPresent || !diagnostics.endpointFormatValid || !config.publicBaseUrl) return false;
    validateNotionImageUrl(config.publicBaseUrl);
    return true;
  } catch { return false; }
}

function responseBytes(url: URL, address: ResolvedAddress): Promise<{ bytes: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest({
      protocol: "https:", hostname: address.address, family: address.family, port: 443,
      method: "GET", path: `${url.pathname}${url.search}`, servername: url.hostname,
      headers: { host: url.host, accept: "image/avif,image/webp,image/png,image/jpeg,image/gif" },
      rejectUnauthorized: true, timeout: 10_000, agent: false,
    }, (response) => {
      if (response.statusCode !== 200) { response.resume(); reject(new Error("Image source returned an unsuccessful response.")); return; }
      const rawLength = Number(response.headers["content-length"] || 0);
      if (rawLength > MAX_IMAGE_BYTES) { response.destroy(); reject(new Error("Image exceeds the 8 MiB import limit.")); return; }
      const contentType = String(response.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer | string) => {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += bytes.byteLength;
        if (size > MAX_IMAGE_BYTES) { response.destroy(new Error("Image exceeds the 8 MiB import limit.")); return; }
        chunks.push(bytes);
      });
      response.on("end", () => resolve({ bytes: Buffer.concat(chunks), contentType }));
      response.on("error", () => reject(new Error("Image download failed.")));
    });
    req.on("timeout", () => req.destroy(new Error("Image download timed out.")));
    req.on("error", () => reject(new Error("Image download failed.")));
    req.end();
  });
}

function isMissingR2Object(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { name?: string; Code?: string; code?: string; $metadata?: { httpStatusCode?: number } };
  return value.$metadata?.httpStatusCode === 404 || ["NotFound", "NoSuchKey", "NotFoundException"].includes(value.name || value.Code || value.code || "");
}

export type ImportedNotionMedia = { id: string; url: string; key: string; checksum: string; contentType: string; size: number; width?: number; height?: number; blockId: string; sourceUrl: string };

export async function importNotionImage(input: { url: string; pageId: string; blockId: string; alt?: string; persistRecord?: boolean }): Promise<ImportedNotionMedia> {
  const url = validateNotionImageUrl(input.url);
  const addresses = isIP(url.hostname) ? [{ address: url.hostname, family: isIP(url.hostname) }] : await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => !isPublicAddress(entry.address))) throw new Error("Image source resolves to a non-public network address and was rejected.");
  const { bytes: sourceBytes, contentType } = await responseBytes(url, addresses[0]);
  if (sourceBytes.byteLength === 0) throw new Error("Image source returned an empty file.");
  const conversion = await convertNotionImageToWebp({ bytes: sourceBytes, contentType });
  const checksum = conversion.checksum;
  const key = notionAssetKey(checksum, "webp");
  const config = mediaStorageConfig();
  const diagnostics = mediaStorageDiagnostics();
  if (!diagnostics.accountIdFormatValid || !diagnostics.bucketMatchesTarget || !diagnostics.credentialsPresent || !diagnostics.endpointFormatValid || !config.publicBaseUrl) throw new Error("R2 is not configured for the RADARSite public media bucket.");
  validateNotionImageUrl(config.publicBaseUrl);

  let stored: Awaited<ReturnType<typeof putMediaObject>>;
  try {
    const existing = await headMediaObject(key);
    if (existing.metadata.checksum !== checksum || existing.size !== conversion.body.byteLength || existing.contentType !== "image/webp") throw new Error("Existing R2 image did not match its checksum-addressed object key.");
    const delivery = validateMediaDeliveryUrl({ key, url: existing.url, config });
    if (!delivery.ok || delivery.semantics !== "public-base") throw new Error("R2 image delivery URL is not a validated public asset URL.");
    stored = existing;
  } catch (error) {
    if (!isMissingR2Object(error)) throw error;
    stored = await putMediaObject({ key, body: conversion.body, contentType: "image/webp", metadata: { "source-provider": "notion", checksum, "source-checksum": conversion.sourceChecksum, "source-content-type": conversion.sourceMimeType, conversion: NOTION_WEBP_CONVERSION } });
  }
  const delivery = validateMediaDeliveryUrl({ key, url: stored.url, config });
  if (!delivery.ok || delivery.semantics !== "public-base") throw new Error("R2 image delivery URL is not a validated public asset URL.");
  const id = `notion-media:${createHash("sha256").update(key).digest("hex")}`;
  const safeSourceUrl = `${url.origin}${url.pathname}`;
  const record: ContentMediaRecord = {
    id, sourceProvider: "notion", sourceUrl: safeSourceUrl, sourceId: conversion.sourceChecksum,
    originalFilename: `${checksum.slice(0, 16)}.webp`, mimeType: "image/webp", fileSize: conversion.body.byteLength,
    width: conversion.width, height: conversion.height, storageProvider: stored.provider, storageBucket: stored.bucket,
    storageKey: stored.key, deliveryUrl: stored.url, checksum, migrationStatus: "migrated",
    provenance: { pageId: input.pageId, blockId: input.blockId, alt: input.alt || "", sourceChecksum: conversion.sourceChecksum, sourceContentType: conversion.sourceMimeType, sourceBytes: conversion.sourceBytes, conversion: NOTION_WEBP_CONVERSION },
  };
  if (input.persistRecord !== false) await upsertMediaRecord(record);
  return { id, url: stored.url, key: stored.key, checksum, contentType: "image/webp", size: conversion.body.byteLength, width: conversion.width, height: conversion.height, blockId: input.blockId, sourceUrl: safeSourceUrl };
}
