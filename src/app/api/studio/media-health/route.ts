import { NextRequest, NextResponse } from "next/server";
import { countMediaRecords, deleteMediaRecord, hasContentDatabase, upsertMediaRecord } from "@/lib/content-server";
import { checkMediaStorage, deleteMediaObject, headMediaObject, putMediaObject } from "@/lib/media-storage";
import { getSessionCookieName, isSessionValid } from "@/lib/studio-server";

export const dynamic = "force-dynamic";
function json(data: unknown, init?: ResponseInit) { const response = NextResponse.json(data, init); response.headers.set("Cache-Control", "no-store, max-age=0"); return response; }

export async function POST(request: NextRequest) {
  if (!isSessionValid(request.cookies.get(getSessionCookieName())?.value)) return json({ error: "Admin authentication required" }, { status: 401 });
  const key = `site-assets/health-check/${crypto.randomUUID()}.txt`;
  const mediaId = `health-check-${crypto.randomUUID()}`;
  let uploaded = false;
  let mediaRecord = false;
  try {
    const storage = await checkMediaStorage();
    const beforeRecords = await countMediaRecords();
    const body = Buffer.from("RADARSite R2 health check", "utf8");
    const uploadedObject = await putMediaObject({ key, body, contentType: "text/plain", metadata: { purpose: "health-check" } });
    uploaded = true;
    if (hasContentDatabase()) {
      await upsertMediaRecord({ id: mediaId, sourceProvider: "health-check", originalFilename: "health-check.txt", mimeType: uploadedObject.contentType, fileSize: uploadedObject.size, storageProvider: uploadedObject.provider, storageBucket: uploadedObject.bucket, storageKey: uploadedObject.key, deliveryUrl: uploadedObject.url, migrationStatus: "migrated", provenance: { purpose: "temporary-health-check" } });
      mediaRecord = true;
    }
    const head = await headMediaObject(key);
    await deleteMediaObject(key);
    let deleted = true;
    try { await headMediaObject(key); deleted = false; } catch { /* expected not found */ }
    if (mediaRecord) await deleteMediaRecord(mediaId);
    const afterRecords = await countMediaRecords();
    return json({ ok: deleted && (!mediaRecord || beforeRecords === afterRecords), storage, upload: { ok: uploaded, key, size: uploadedObject.size }, metadata: { ok: head.size === body.byteLength, contentType: head.contentType, size: head.size }, deletion: { ok: deleted }, contentMedia: { configured: hasContentDatabase(), temporaryRecordCreated: mediaRecord, orphanFree: !mediaRecord || beforeRecords === afterRecords } });
  } catch (error) {
    if (uploaded) { try { await deleteMediaObject(key); } catch { /* best effort cleanup */ } }
    if (mediaRecord) { try { await deleteMediaRecord(mediaId); } catch { /* best effort cleanup */ } }
    return json({ ok: false, uploaded, error: error instanceof Error ? error.message : "R2 health test failed", cleanupAttempted: uploaded || mediaRecord }, { status: 502 });
  }
}
