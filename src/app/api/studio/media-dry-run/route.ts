import { NextRequest, NextResponse } from "next/server";
import { createWebpDerivatives, checksumSha256, headMediaObject, mediaStorageConfig, putMediaObject, readMediaObjectBytes, validateMediaDeliveryUrl } from "@/lib/media-storage";
import { getSessionCookieName, isSessionValid } from "@/lib/studio-server";

export const dynamic = "force-dynamic";

const DRY_RUN_CONFIRMATION = "attachment-977-webp-dry-run";
const SOURCE = {
  attachmentId: 977,
  sourceUrl: "http://radarcharts.net/wp-content/uploads/2026/09/79eb0fd8-f477-422c-bfb1-6ef254d959cc.jpeg",
  expectedBytes: 93215,
  expectedSha256: "9c79fcd90e064ac61f377b28a7f6d2962e4194f4b3dee9ce6cfcac92882575c7",
  articleId: 973,
};

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export async function POST(request: NextRequest) {
  if (!isSessionValid(request.cookies.get(getSessionCookieName())?.value)) return json({ error: "Admin authentication required" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { confirmation?: string };
  if (body.confirmation !== DRY_RUN_CONFIRMATION) return json({ error: "Explicit dry-run confirmation required", expected: DRY_RUN_CONFIRMATION }, { status: 400 });

  const keyPrefix = `dry-run/current-media/attachment-${SOURCE.attachmentId}`;
  try {
    const sourceResponse = await fetch(SOURCE.sourceUrl, { cache: "no-store", redirect: "follow" });
    if (!sourceResponse.ok) throw new Error(`WordPress source returned HTTP ${sourceResponse.status}`);
    const source = Buffer.from(await sourceResponse.arrayBuffer());
    const sourceSha256 = checksumSha256(source);
    if (source.length !== SOURCE.expectedBytes || sourceSha256 !== SOURCE.expectedSha256) {
      throw new Error(`Source verification mismatch: bytes=${source.length}, sha256=${sourceSha256}`);
    }

    const conversion = await createWebpDerivatives({ source, keyPrefix, quality: 82 });
    const uploaded = [];
    for (const derivative of conversion.derivatives) {
      const derivativeSha256 = checksumSha256(derivative.body);
      const stored = await putMediaObject({
        key: derivative.key,
        body: derivative.body,
        contentType: derivative.contentType,
        cacheControl: "public, max-age=31536000, immutable",
        metadata: {
          dry_run: "true",
          source_provider: "radarcharts",
          source_article_id: String(SOURCE.articleId),
          source_attachment_id: String(SOURCE.attachmentId),
          source_sha256: sourceSha256,
          derivative_sha256: derivativeSha256,
        },
      });
      const head = await headMediaObject(derivative.key);
      const downloaded = await readMediaObjectBytes(derivative.key);
      const downloadedSha256 = checksumSha256(downloaded);
      const deliveryUrl = validateMediaDeliveryUrl({ key: derivative.key, url: stored.url, config: mediaStorageConfig() });
      uploaded.push({
        key: derivative.key,
        url: stored.url,
        contentType: head.contentType,
        uploadedBytes: derivative.body.byteLength,
        headBytes: head.size,
        downloadedBytes: downloaded.byteLength,
        expectedSha256: derivativeSha256,
        downloadedSha256,
        bytesMatch: head.size === derivative.body.byteLength && downloaded.byteLength === derivative.body.byteLength,
        checksumMatch: downloadedSha256 === derivativeSha256,
        deliveryUrl,
        metadata: head.metadata,
        width: derivative.width,
        height: derivative.height,
      });
    }

    return json({ ok: uploaded.every((item) => item.bytesMatch && item.checksumMatch), source: { ...SOURCE, actualBytes: source.length, actualSha256: sourceSha256, contentType: sourceResponse.headers.get("content-type") }, conversion: { sourceMimeType: conversion.sourceMimeType, sourceWidth: conversion.sourceWidth, sourceHeight: conversion.sourceHeight, quality: 82 }, r2: { bucket: mediaStorageConfig().bucket, keyPrefix, uploaded } });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Media dry run failed", source: SOURCE, keyPrefix }, { status: 502 });
  }
}
