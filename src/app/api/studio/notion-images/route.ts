import { NextRequest, NextResponse } from "next/server";
import { EDITORIAL_PROPERTY_NAMES, NOTION_API_VERSION, normalizeNotionPageId, notionPageCoverUrl, readNotionProperty, type NotionPage } from "@/lib/notion-editorial-sync";
import { isSameOriginMutation, rateLimit } from "@/lib/request-security";
import { getSessionCookieName, isSessionValid } from "@/lib/studio-server";
import { convertNotionImageToWebp, notionAssetKey, notionR2ConfigurationReady } from "@/lib/notion-media";
import { mediaStorageConfig, putMediaObject, validateMediaDeliveryUrl } from "@/lib/media-storage";
import { NOTION_MEDIA_STAGING_PAGES } from "@/lib/notion-media-scope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_FILE_BYTES + 64 * 1024;
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const PAGE_IDS = new Set<string>(NOTION_MEDIA_STAGING_PAGES);
const jsonHeaders = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };

type ApiFault = Error & { status: number; code: string };
type NotionFilePage = NotionPage & { parent?: Record<string, unknown> };
function fault(message: string, status: number, code: string): ApiFault { return Object.assign(new Error(message), { status, code }); }
function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: jsonHeaders }); }
function requireSession(request: NextRequest) { return isSessionValid(request.cookies.get(getSessionCookieName())?.value); }
function apiToken() { const token = process.env.NOTION_API_KEY || ""; if (!token) throw fault("Notion image service is not configured.", 503, "notion_not_configured"); return token; }
function dataSourceId() { const id = normalizeNotionPageId(process.env.RADAR_NOTION_DATA_SOURCE_ID); if (!id) throw fault("Notion image service is not configured.", 503, "notion_not_configured"); return id; }
async function notionJson<T>(url: string, token: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, cache: "no-store", redirect: "error", headers: { Authorization: `Bearer ${token}`, "Notion-Version": NOTION_API_VERSION, accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers } });
  } catch { throw fault("Could not reach Notion. No article update was confirmed.", 502, "notion_unavailable"); }
  if (!response.ok) {
    const status = response.status === 401 || response.status === 403 ? 502 : response.status === 404 ? 404 : response.status === 429 ? 503 : 502;
    throw fault(status === 404 ? "The selected Notion article could not be found." : status === 503 ? "Notion is temporarily rate limited. Try again shortly." : "Notion did not accept the image update.", status, status === 404 ? "notion_page_not_found" : status === 503 ? "notion_rate_limited" : "notion_update_failed");
  }
  return await response.json() as T;
}
async function pageFor(id: string, token: string): Promise<NotionFilePage> {
  const page = await notionJson<NotionFilePage>(`https://api.notion.com/v1/pages/${encodeURIComponent(id)}`, token);
  const parent = page.parent || {};
  const parentId = normalizeNotionPageId(String(parent.data_source_id || parent.database_id || ""));
  if (normalizeNotionPageId(page.id) !== id || parentId !== dataSourceId()) throw fault("The selected page is outside the configured editorial pipeline.", 403, "page_not_authorized");
  return page;
}
function pageTitle(page: NotionPage) { return String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.title) || "Untitled article").slice(0, 300); }
function imageStatus(page: NotionPage) {
  return {
    id: normalizeNotionPageId(page.id),
    title: pageTitle(page),
    hasFeaturedImageUpload: Boolean(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.featuredImageUpload)),
    hasPageCover: Boolean(notionPageCoverUrl(page)),
  };
}
async function readBoundedForm(request: NextRequest): Promise<FormData> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) throw fault("Choose an image file to upload.", 400, "invalid_upload");
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_REQUEST_BYTES) throw fault("Image exceeds the 4 MiB upload limit.", 413, "file_too_large");
  const reader = request.body?.getReader();
  if (!reader) throw fault("Upload body is empty.", 400, "invalid_upload");
  const chunks: Buffer[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REQUEST_BYTES) { await reader.cancel().catch(() => undefined); throw fault("Image exceeds the 4 MiB upload limit.", 413, "file_too_large"); }
    chunks.push(Buffer.from(value));
  }
  try {
    const requestCopy = new Request("http://localhost/upload", { method: "POST", headers: { "content-type": contentType }, body: new Uint8Array(Buffer.concat(chunks, size)) });
    return await requestCopy.formData();
  } catch { throw fault("Upload form could not be read.", 400, "invalid_upload"); }
}

export async function GET(request: NextRequest) {
  if (!requireSession(request)) return json({ error: "Admin authentication required." }, 401);
  if (!rateLimit(request, "studio-notion-images-read", 20).allowed) return json({ error: "Too many requests. Try again shortly." }, 429);
  try {
    const token = apiToken();
    const pages = [];
    for (const id of NOTION_MEDIA_STAGING_PAGES) pages.push(imageStatus(await pageFor(id, token)));
    return json({ pages, storageReady: notionR2ConfigurationReady() });
  } catch (error) {
    const problem = error as Partial<ApiFault>;
    const status = typeof problem.status === "number" ? problem.status : 502;
    const code = typeof problem.code === "string" ? problem.code : "notion_read_failed";
    console.error("[studio-notion-images] list failed", { code });
    return json({ error: typeof problem.message === "string" ? problem.message : "Could not read the configured Notion articles.", code }, status);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return json({ error: "Cross-origin mutation rejected." }, 403);
  if (!requireSession(request)) return json({ error: "Admin authentication required." }, 401);
  if (!rateLimit(request, "studio-notion-images-write", 6).allowed) return json({ error: "Too many uploads. Try again shortly." }, 429);
  let storedObject = false;
  try {
    const form = await readBoundedForm(request);
    const rawId = form.get("pageId");
    const pageId = typeof rawId === "string" ? normalizeNotionPageId(rawId) : "";
    if (!pageId || !PAGE_IDS.has(pageId)) throw fault("Choose an article from the configured list.", 400, "page_not_authorized");
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 1 || file.size > MAX_FILE_BYTES || !IMAGE_MIME_TYPES.has(file.type.toLowerCase())) throw fault("Choose a JPEG, PNG, WebP, GIF or AVIF image up to 4 MiB.", 400, "invalid_image");
    const token = apiToken();
    if (!notionR2ConfigurationReady()) throw fault("Public R2 image storage is not configured for this environment.", 503, "media_storage_not_configured");
    const page = await pageFor(pageId, token);
    const currentImage = Boolean(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.featuredImageUpload));
    if (currentImage && form.get("confirmReplacement") !== "true") throw fault("This article already has a Featured Image Upload. Confirm replacement in Studio and retry.", 409, "replacement_confirmation_required");
    const conversion = await convertNotionImageToWebp({ bytes: Buffer.from(await file.arrayBuffer()), contentType: file.type.toLowerCase() });
    const key = notionAssetKey(conversion.checksum, "webp");
    const saved = await putMediaObject({
      key,
      body: conversion.body,
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
      metadata: { checksum: conversion.checksum, sourcechecksum: conversion.sourceChecksum, conversion: "webp-q80-max2400-v1", pageid: pageId },
    });
    storedObject = true;
    const config = mediaStorageConfig();
    const delivery = validateMediaDeliveryUrl({ key, url: saved.url, config });
    if (!delivery.ok || delivery.semantics !== "public-base") throw fault("Image storage returned an invalid public delivery URL; the Notion page was not changed.", 502, "invalid_media_delivery");
    const safeName = `radar-cover-${conversion.checksum.slice(0, 12)}.webp`;
    const updated = await notionJson<NotionFilePage>(`https://api.notion.com/v1/pages/${encodeURIComponent(pageId)}`, token, {
      method: "PATCH",
      body: JSON.stringify({ properties: { [EDITORIAL_PROPERTY_NAMES.featuredImageUpload]: { files: [{ type: "external", name: safeName, external: { url: saved.url } }] } } }),
    });
    const updatedUrl = String(readNotionProperty(updated, EDITORIAL_PROPERTY_NAMES.featuredImageUpload) || "");
    if (updatedUrl !== saved.url) throw fault("Notion accepted the request but did not confirm the new Featured Image Upload URL. Review the article before retrying.", 502, "notion_update_unverified");
    return json({ ok: true, pageId, title: pageTitle(updated), hasFeaturedImageUpload: true, width: conversion.width, height: conversion.height, size: conversion.body.byteLength });
  } catch (error) {
    const problem = error as Partial<ApiFault>;
    const status = typeof problem.status === "number" ? problem.status : 422;
    const code = typeof problem.code === "string" ? problem.code : "image_upload_failed";
    console.error("[studio-notion-images] upload failed", { code, storedObject });
    const message = typeof problem.message === "string" ? problem.message : "The image could not be uploaded.";
    return json({ error: storedObject && status >= 500 ? `${message} The converted image may remain safely stored in R2; the Notion update was not confirmed.` : message, code }, status);
  }
}
