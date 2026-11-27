import { NextRequest, NextResponse } from "next/server";

import { readContent } from "@/lib/content-server";
import { deleteMediaObject } from "@/lib/media-storage";
import {
  deletionGuard,
  findMediaReferences,
  filterMediaAssets,
  MEDIA_MIME_TYPES,
  getMediaAsset,
  readMediaLibrary,
  removeMediaAsset,
  type MediaLibraryAsset,
} from "@/lib/media-library";
import { maxMediaUploadBytes, processStudioImageUpload, MediaUploadValidationError } from "@/lib/media-upload";
import { isSameOriginMutation, rateLimit } from "@/lib/request-security";
import { getSessionCookieName, isSessionValid } from "@/lib/studio-server";

export const dynamic = "force-dynamic";
const UPLOAD_RATE_LIMIT = 12;
const READ_RATE_LIMIT = 120;
const MUTATION_GUARD = "Cross-origin mutation rejected";
const AUTH_REQUIRED = "Admin authentication required";

function json(data: unknown, init?: ResponseInit) { const response = NextResponse.json(data, init); response.headers.set("Cache-Control", "no-store, max-age=0"); response.headers.set("X-Content-Type-Options", "nosniff"); return response; }
function mutationGuard(request: NextRequest) { return isSameOriginMutation(request) ? null : json({ error: MUTATION_GUARD }, { status: 403 }); }
function requireSession(request: NextRequest) { return isSessionValid(request.cookies.get(getSessionCookieName())?.value) ? null : json({ error: AUTH_REQUIRED }, { status: 401 }); }
function limited(request: NextRequest, scope: string, limit: number) { const result = rateLimit(request, scope, limit); return result.allowed ? null : json({ error: "Too many requests. Try again later." }, { status: 429, headers: { "Retry-After": String(result.retryAfter) } }); }
function text(value: FormDataEntryValue | null, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function isMissingStorageObject(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { name?: string; Code?: string; code?: string; $metadata?: { httpStatusCode?: number } };
  return value.$metadata?.httpStatusCode === 404 || ["NotFound", "NoSuchKey", "NotFoundException"].includes(value.name || value.Code || value.code || "");
}

function validationStatus(code: MediaUploadErrorCode) {
  switch (code) {
    case "MEDIA_UPLOAD_TOO_LARGE": return 413;
    case "MEDIA_MIME_MISMATCH":
    case "MEDIA_IMAGE_INVALID": return 415;
    default: return 400;
  }
}

export async function GET(request: NextRequest) {
  const blocked = limited(request, "studio-media-read", READ_RATE_LIMIT); if (blocked) return blocked;
  const session = requireSession(request); if (session) return session;
  const params = request.nextUrl.searchParams;
  try {
    const { manifest } = await readMediaLibrary();
    const result = filterMediaAssets(manifest?.assets ?? [], {
      search: params.get("search") || undefined,
      mime: params.get("mime") || undefined,
      page: Number(params.get("page")) || 1,
      pageSize: Number(params.get("pageSize")) || 24,
    });
    return json({ ...result, mimeTypes: MEDIA_MIME_TYPES, maxUploadBytes: maxMediaUploadBytes() });
  } catch (error) {
    console.error("[api/studio/media] library read failed:", error instanceof Error ? error.message : String(error));
    return json({ error: "Media library is unavailable" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const guard = mutationGuard(request); if (guard) return guard;
  const blocked = limited(request, "studio-media-upload", UPLOAD_RATE_LIMIT); if (blocked) return blocked;
  const session = requireSession(request); if (session) return session;
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("multipart/form-data")) return json({ error: "A multipart form upload is required" }, { status: 400 });
  const declaredLength = Number(request.headers.get("content-length") || 0);
  const limit = maxMediaUploadBytes();
  if (declaredLength > limit + 64 * 1024) return json({ error: `Image exceeds the ${Math.round(limit / (1024 * 1024))} MiB upload limit.` }, { status: 413 });
  const form = await request.formData().catch(() => null);
  if (!form) return json({ error: "The upload could not be read" }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return json({ error: "Attach an image file to upload" }, { status: 400 });
  if (file.size > limit) return json({ error: `Image exceeds the ${Math.round(limit / (1024 * 1024))} MiB upload limit.` }, { status: 413 });
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await processStudioImageUpload({
      bytes,
      filename: file.name || "upload.jpg",
      declaredMime: file.type,
      title: text(form.get("title"), 200),
      alt: text(form.get("alt"), 300),
      caption: text(form.get("caption"), 500),
      uploader: "studio",
    });
    return json({ asset: result.asset, conversion: result.conversion, warnings: result.warnings }, { status: 201 });
  } catch (error) {
    if (error instanceof MediaUploadValidationError) return json({ error: error.message, code: error.code }, { status: validationStatus(error.code) });
    console.error("[api/studio/media] upload failed:", error instanceof Error ? error.message : String(error));
    return json({ error: "The image could not be stored. Nothing was changed; try again." }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const guard = mutationGuard(request); if (guard) return guard;
  const blocked = limited(request, "studio-media-delete", UPLOAD_RATE_LIMIT); if (blocked) return blocked;
  const session = requireSession(request); if (session) return session;
  const params = request.nextUrl.searchParams;
  const id = (params.get("id") || "").trim();
  if (!id) return json({ error: "An asset id is required" }, { status: 400 });
  try {
    const asset = await getMediaAsset(id);
    if (!asset) return json({ error: "Asset not found" }, { status: 404 });
    const content = await readContent();
    const usageRecords = [...content.articles, ...content.magazine, ...content.pages].map((item) => item as Record<string, unknown>);
    const references = findMediaReferences(asset, usageRecords);
    const verdict = deletionGuard({ references, force: params.get("force") === "true" });
    if (!verdict.allowed) return json({ error: verdict.reason, code: "media_asset_in_use", references: references.slice(0, 20) }, { status: 409 });
    const removed: MediaLibraryAsset | null = await removeMediaAsset(id);
    if (!removed) return json({ error: "Asset not found" }, { status: 404 });
    const removedObjects: string[] = [];
    for (const key of [removed.storageKey, ...removed.derivedKeys]) {
      try { await deleteMediaObject(key); removedObjects.push(key); }
      catch (error) { if (!isMissingStorageObject(error)) throw error; }
    }
    return json({ deleted: id, removedObjects, referencesConsidered: references.length });
  } catch (error) {
    console.error("[api/studio/media] delete failed:", error instanceof Error ? error.message : String(error));
    return json({ error: "The asset could not be deleted. Nothing was changed; try again." }, { status: 502 });
  }
}
