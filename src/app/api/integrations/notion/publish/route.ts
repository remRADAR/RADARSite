import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { normalizeArticleInput } from "@/app/api/studio/route";
import {
  type CmsRecord, type ContentCollections,
} from "@/lib/content-server";
import { articlePath } from "@/lib/editorial-normalization";
import { createMediaRelationshipId } from "@/lib/media-relationships";
import { type ImportedNotionMedia, validateNotionImageUrl } from "@/lib/notion-media";
import { notionPublishRuntime } from "@/lib/notion-publish-runtime";
import {
  buildNotionPageUpdates, cmsContentCollisions, cmsSyncSnapshot, detectNotionCmsConflicts,
  deterministicCmsId, findNotionCmsRecord, mapNotionPageToDraft, normalizeNotionPageId,
  notionContentFingerprint, readNotionProperty, sameNotionPageRevision, sourceFingerprint, validateEditorialSchema,
  validatePageAuthorization, renderNotionBlockTree, EDITORIAL_PROPERTY_NAMES,
  notionPageCoverUrl, isSafePublicHttpsUrl,
  NOTION_API_VERSION, type NotionBlock, type NotionDataSource, type NotionPage,
} from "@/lib/notion-editorial-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_REQUESTS_PER_MINUTE = 30;
const requestCounts = new Map<string, { count: number; expiresAt: number }>();

type ApiError = Error & { status?: number; code?: string };
function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
function apiError(message: string, status: number, code: string): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.code = code;
  return error;
}
function rateLimited(request: NextRequest): boolean {
  const now = Date.now();
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const existing = requestCounts.get(address);
  if (!existing || existing.expiresAt <= now) {
    if (requestCounts.size > 5000) for (const [key, item] of requestCounts) if (item.expiresAt <= now) requestCounts.delete(key);
    requestCounts.set(address, { count: 1, expiresAt: now + 60_000 });
    return false;
  }
  existing.count += 1;
  return existing.count > MAX_REQUESTS_PER_MINUTE;
}
async function readBoundedRequestBody(request: NextRequest): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Buffer[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REQUEST_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw apiError("Request payload is too large.", 413, "payload_too_large");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, size).toString("utf8");
}
function bearerMatches(request: NextRequest): boolean {
  const expected = process.env.RADAR_NOTION_SYNC_SECRET || "";
  const supplied = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!expected || !supplied) return false;
  const left = createHash("sha256").update(expected).digest();
  const right = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(left, right);
}
async function notionJson<T>(url: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    redirect: "error",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_API_VERSION,
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const status = response.status === 404 ? 404 : response.status === 403 ? 403 : response.status === 429 ? 503 : response.status >= 500 ? 502 : 422;
    throw apiError(`Notion API request failed with HTTP ${response.status}.`, status, status === 404 ? "notion_object_not_found" : status === 403 ? "notion_permission_denied" : status === 503 ? "notion_rate_limited" : "notion_api_error");
  }
  return await response.json() as T;
}
async function notionChildren(blockId: string, token: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor = "";
  const seen = new Set<string>();
  do {
    const query = new URLSearchParams({ page_size: "100" });
    if (cursor) query.set("start_cursor", cursor);
    const page = await notionJson<{ results?: NotionBlock[]; has_more?: boolean; next_cursor?: string | null }>(`https://api.notion.com/v1/blocks/${encodeURIComponent(blockId)}/children?${query}`, token);
    if (!Array.isArray(page.results)) throw apiError("Notion returned an invalid block list.", 502, "notion_invalid_response");
    blocks.push(...page.results);
    if (blocks.length > 1500) throw apiError("Notion page exceeds the supported 1,500-block limit.", 422, "notion_content_too_large");
    const next = page.next_cursor || "";
    if (page.has_more && (!next || seen.has(next))) throw apiError("Notion pagination returned an invalid cursor.", 502, "notion_pagination_error");
    if (next) seen.add(next);
    cursor = page.has_more ? next : "";
  } while (cursor);
  return blocks;
}
function recordsIn(content: ContentCollections): CmsRecord[] {
  return [...content.articles, ...content.magazine].map((item) => item as CmsRecord);
}
function toPublishedRecord(page: NotionPage, dataSource: NotionDataSource, html: string, existing?: CmsRecord, featuredImage = ""): CmsRecord {
  const draft = mapNotionPageToDraft(page, dataSource, html);
  const article = normalizeArticleInput({
    id: existing?.id || deterministicCmsId(draft.pageId),
    sourceProvider: "notion",
    sourceId: draft.pageId,
    sourceUrl: draft.notionUrl,
    notionPageId: draft.pageId,
    notionLastEditedAt: draft.sourceEditedAt,
    title: draft.title,
    excerpt: draft.excerpt,
    bodyHtml: draft.bodyHtml,
    editorialType: draft.editorialType,
    magazineSubtype: draft.magazineSubtype,
    projectSection: draft.projectSection,
    tags: draft.tags,
    tagsApproved: draft.tags,
    categories: draft.projectSection ? [draft.projectSection] : ["RADARArticles"],
    featured: draft.featured,
    featuredImage: featuredImage || existing?.featuredImage || "",
    featuredImageAlt: draft.title,
    author: draft.author,
    date: existing?.date || existing?.publishedAt || new Date().toISOString(),
    status: "published",
    metaTitle: draft.seoTitle,
    metaDescription: draft.seoDescription,
    canonicalUrl: draft.canonicalUrl || existing?.canonicalUrl || "",
    socialImage: featuredImage || existing?.socialImage || existing?.featuredImage || "",
    noindex: false,
  }, existing);
  // normalizeArticleInput starts from a fresh Studio UUID by default; override it
  // for new Notion records so retries always resolve the same CMS identity.
  article.id = existing?.id || deterministicCmsId(draft.pageId);
  if (!article.canonicalUrl) article.canonicalUrl = `https://radarcharts.net${articlePath(article)}`;
  article.sourceProvider = "notion";
  article.sourceId = draft.pageId;
  article.sourceUrl = draft.notionUrl;
  article.notionPageId = draft.pageId;
  article.notionLastEditedAt = draft.sourceEditedAt;
  article.featured = draft.featured;
  article.sourceSnapshot = cmsSyncSnapshot(article);
  article.sourceSnapshotHash = sourceFingerprint(article);
  return article;
}
function replaceCollection(content: ContentCollections, article: CmsRecord, existing?: CmsRecord): ContentCollections {
  const articles = [...content.articles] as CmsRecord[];
  const index = existing ? articles.findIndex((record) => record.id === existing.id) : -1;
  if (index >= 0) articles[index] = article;
  else articles.push(article);
  const magazine = existing ? content.magazine.filter((record) => (record as CmsRecord).id !== existing.id) : content.magazine;
  return { ...content, articles: articles as ContentCollections["articles"], magazine };
}
async function updateNotionPage(pageId: string, dataSource: NotionDataSource, values: Parameters<typeof buildNotionPageUpdates>[1], token: string) {
  const properties = buildNotionPageUpdates(dataSource, values);
  return await notionJson<NotionPage>(`https://api.notion.com/v1/pages/${encodeURIComponent(pageId)}`, token, {
    method: "PATCH", body: JSON.stringify({ properties }),
  });
}
async function assertNotionSourceCurrent(
  expectedPage: NotionPage,
  expectedStatus: string,
  expectedDraft: ReturnType<typeof mapNotionPageToDraft>,
  expectedRendered: Awaited<ReturnType<typeof renderNotionBlockTree>>,
  dataSource: NotionDataSource,
  token: string,
): Promise<NotionPage> {
  const pageId = normalizeNotionPageId(expectedPage.id);
  if (!pageId) throw apiError("Notion page identity is invalid during source revalidation.", 409, "notion_source_changed");
  const currentPage = await notionJson<NotionPage>(`https://api.notion.com/v1/pages/${encodeURIComponent(pageId)}`, token);
  const currentPermission = validatePageAuthorization(currentPage, dataSource);
  if (!currentPermission.ok || currentPermission.status !== expectedStatus || !currentPermission.publishChecked) {
    throw apiError("Notion approval or publishing authorization changed during the sync. No new CMS content was written; review and retry.", 409, "notion_source_changed");
  }
  if (!sameNotionPageRevision(expectedPage, currentPage)) {
    throw apiError("Notion page properties or edit revision changed during the sync. Review and retry before publishing.", 409, "notion_source_changed");
  }
  const currentBlocks = await notionChildren(pageId, token);
  const currentRendered = await renderNotionBlockTree(
    currentBlocks,
    (blockId) => notionChildren(blockId, token),
    async (_url, blockId) => `https://notion-revision.invalid/${encodeURIComponent(blockId)}`,
  );
  let currentDraft: ReturnType<typeof mapNotionPageToDraft>;
  try { currentDraft = mapNotionPageToDraft(currentPage, dataSource, currentRendered.html); }
  catch { throw apiError("Notion source content no longer satisfies the publishing contract. Review and retry.", 409, "notion_source_changed"); }
  if (notionContentFingerprint(currentDraft, currentRendered) !== notionContentFingerprint(expectedDraft, expectedRendered)) {
    throw apiError("Notion block content changed during the sync. Review and retry before publishing.", 409, "notion_source_changed");
  }
  return currentPage;
}
function findLinkedRecord(articles: CmsRecord[], pageId: string): CmsRecord | undefined {
  return findNotionCmsRecord(articles, pageId);
}
export async function POST(request: NextRequest) {
  if (process.env.RADAR_NOTION_PUBLISHING_ENABLED !== "true") return json({ error: "Notion publishing is disabled in this environment.", code: "integration_disabled" }, { status: 503 });
  if (rateLimited(request)) return json({ error: "Too many publish requests. Try again later." }, { status: 429, headers: { "Retry-After": "60" } });
  if (!bearerMatches(request)) return json({ error: "Integration authorization required.", code: "unauthorized" }, { status: 401 });
  const notionToken = process.env.NOTION_API_KEY || "";
  const dataSourceId = normalizeNotionPageId(process.env.RADAR_NOTION_DATA_SOURCE_ID);
  if (!notionToken || !process.env.RADAR_NOTION_SYNC_SECRET || !dataSourceId) return json({ error: "Required Notion integration configuration is incomplete.", code: "configuration_missing" }, { status: 503 });
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) return json({ error: "Request payload is too large." }, { status: 413 });
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) return json({ error: "Expected an application/json request." }, { status: 415 });
  let payload: unknown;
  try {
    const body = await readBoundedRequestBody(request);
    payload = JSON.parse(body);
  } catch (error) {
    if ((error as ApiError).code === "payload_too_large") return json({ error: "Request payload is too large." }, { status: 413 });
    return json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const input = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
  const pageId = normalizeNotionPageId(input.pageId);
  if (!pageId || Object.keys(input).some((key) => !["pageId", "dryRun"].includes(key)) || (input.dryRun !== undefined && typeof input.dryRun !== "boolean")) return json({ error: "Provide one valid pageId and an optional boolean dryRun value." }, { status: 400 });

  try {
    const dataSource = await notionJson<NotionDataSource>(`https://api.notion.com/v1/data_sources/${encodeURIComponent(dataSourceId)}`, notionToken);
    const schemaErrors = validateEditorialSchema(dataSource);
    if (schemaErrors.length) return json({ error: "The connected Notion data-source schema does not match the supported publishing contract.", code: "notion_schema_mismatch", details: schemaErrors }, { status: 503 });
    const page = await notionJson<NotionPage>(`https://api.notion.com/v1/pages/${encodeURIComponent(pageId)}`, notionToken);
    if (normalizeNotionPageId(page.id) !== pageId) return json({ error: "Notion returned a different page than requested." }, { status: 502 });
    const permission = validatePageAuthorization(page, dataSource);
    if (!permission.ok) return json({ error: permission.error, code: "not_approved" }, { status: 409 });

    const isDryRun = input.dryRun === true;
    const topLevelBlocks = await notionChildren(pageId, notionToken);
    const imported = new Map<string, ImportedNotionMedia>();
    let rendered: Awaited<ReturnType<typeof renderNotionBlockTree>>;
    try { rendered = await renderNotionBlockTree(topLevelBlocks, (blockId) => notionChildren(blockId, notionToken), async (url, blockId, alt) => {
      if (isDryRun) return validateNotionImageUrl(url).toString();
      let image: ImportedNotionMedia;
      try { image = await notionPublishRuntime.importNotionImage({ url, pageId, blockId, alt }); }
      catch {
        try { await updateNotionPage(pageId, dataSource, { syncStatus: "Failed" }, notionToken); } catch { /* the API response below remains the visible failure */ }
        throw apiError("Image import failed before the CMS was updated. Check R2 configuration and secure server logs.", 502, "media_import_failed");
      }
      imported.set(blockId, image);
      return image.url;
    }); }
    catch (error) {
      if ((error as ApiError).code) throw error;
      throw apiError(error instanceof Error ? error.message.slice(0, 300) : "Notion content could not be safely converted.", 422, "notion_content_invalid");
    }
    let draft: ReturnType<typeof mapNotionPageToDraft>;
    try { draft = mapNotionPageToDraft(page, dataSource, rendered.html); }
    catch (error) { throw apiError(error instanceof Error ? error.message.slice(0, 300) : "Notion editorial fields are invalid.", 422, "editorial_content_invalid"); }
    // Featured image priority: explicit Featured Image URL, then the Notion page cover.
    // Notion cover file URLs are short-lived signed links, so the cover URL is always read
    // fresh from the page payload at publish time and imported into R2 before the CMS write.
    const coverUrl = notionPageCoverUrl(page);
    const featuredSource = draft.featuredImageUrl || (coverUrl && isSafePublicHttpsUrl(coverUrl) ? coverUrl : "");
    let featuredImage = "";
    if (featuredSource) {
      if (isDryRun) validateNotionImageUrl(featuredSource);
      else {
        try {
          const image = await notionPublishRuntime.importNotionImage({ url: featuredSource, pageId, blockId: "featured-image", alt: draft.title });
          imported.set("featured-image", image);
          featuredImage = image.url;
        } catch {
          try { await updateNotionPage(pageId, dataSource, { syncStatus: "Failed" }, notionToken); } catch { /* the API response below remains the visible failure */ }
          throw apiError("Featured image import failed before the CMS was updated. Check R2 configuration and secure server logs.", 502, "media_import_failed");
        }
      }
    }

    if (isDryRun) {
      const previewRecord = toPublishedRecord(page, dataSource, rendered.html, undefined, featuredSource ? "https://preview.invalid/notion-image" : "");
      const cmsSnapshot = await notionPublishRuntime.readContentSnapshotReadOnly();
      const blockers: string[] = [];
      const hasImages = rendered.images.length > 0 || Boolean(featuredSource);
      const r2Ready = notionPublishRuntime.notionR2ConfigurationReady();
      if (hasImages) blockers.push("Dry-run does not download or upload images; actual image content, checksum, and final CDN URLs remain unverified.");
      if (hasImages && !r2Ready) blockers.push("R2 public-media configuration is incomplete for the images in this page.");
      let existing: CmsRecord | undefined;
      if (!cmsSnapshot) blockers.push("Read-only CMS collision preflight is unavailable; DATABASE_URL and an existing studio_content table are required.");
      else {
        const allRecords = recordsIn(cmsSnapshot);
        const matches = allRecords.filter((item) => item.notionPageId === pageId || (item.sourceProvider === "notion" && normalizeNotionPageId(item.sourceId) === pageId));
        if (matches.length > 1) blockers.push("Multiple CMS records already map to this Notion page.");
        existing = matches[0];
        const currentCmsId = String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.cmsId) || "");
        if (currentCmsId && (!existing || allRecords.find((item) => item.id === currentCmsId) !== existing)) blockers.push("RADARSite CMS ID does not match the stored Notion page identity.");
        if (existing && !existing.sourceSnapshot) blockers.push("The existing CMS record lacks a sync snapshot and needs manual reconciliation.");
        if (permission.status === "Publishing" && !existing) blockers.push("Publishing can only be resumed when its CMS record exists.");
        const comparisonRecord = existing ? toPublishedRecord(page, dataSource, rendered.html, existing, featuredSource ? "https://preview.invalid/notion-image" : "") : undefined;
        if (existing && comparisonRecord && hasImages) {
          for (const key of ["body", "bodyHtml", "featuredImage", "imageUrl", "featuredImageAlt", "socialImage"]) comparisonRecord[key] = existing[key];
        }
        if (existing && comparisonRecord) blockers.push(...detectNotionCmsConflicts(existing, comparisonRecord).map((field) => `CMS edit conflict: ${field}.`));
        if (permission.status === "Published" && existing && comparisonRecord && sourceFingerprint(existing) !== sourceFingerprint(comparisonRecord)) blockers.push("Published Notion content changed; return the page to Approved before updating it.");
        if (permission.status === "Publishing" && existing && comparisonRecord && existing.sourceSnapshotHash && existing.sourceSnapshotHash !== sourceFingerprint(comparisonRecord)) blockers.push("Publishing content no longer matches the CMS record; review and reapprove the Notion page.");
        blockers.push(...cmsContentCollisions(allRecords, previewRecord, existing).map((field) => `CMS collision: ${field}.`));
      }
      return json({
        ok: true, dryRun: true, pageId, dataSourceId, externalWrites: 0,
        cmsPreflightAvailable: Boolean(cmsSnapshot), wouldPublish: Boolean(cmsSnapshot && blockers.length === 0),
        payload: {
          cmsId: existing?.id || previewRecord.id, slug: existing?.slug || previewRecord.slug,
          title: draft.title, excerpt: draft.excerpt, author: draft.author, contentType: draft.editorialType,
          magazineSubtype: draft.magazineSubtype || "", projectSection: draft.projectSection || "",
          tags: draft.tags, featured: draft.featured, canonicalUrl: existing?.canonicalUrl || previewRecord.canonicalUrl || "",
          metaTitle: draft.seoTitle, metaDescription: draft.seoDescription,
          bodyCharacters: draft.body.length, inlineImageCount: rendered.images.length,
          featuredImageWouldBeImported: Boolean(featuredSource), r2ConfigurationReady: r2Ready,
        },
        blockers, previewOnly: true,
      });
    }

    const cmsId = String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.cmsId) || "");
    let finalArticle: CmsRecord | undefined;
    let finalContent: ContentCollections | undefined;
    let syncAt = "";
    let conflictDetails: string[] = [];
    let expectedNotionPage = page;
    let expectedNotionStatus = permission.status;
    for (let attempt = 0; attempt < 3; attempt++) {
      const snapshot = await notionPublishRuntime.readContentWriteSnapshot();
      const allRecords = recordsIn(snapshot.content);
      const matchingRecords = allRecords.filter((item) => item.notionPageId === pageId || (item.sourceProvider === "notion" && normalizeNotionPageId(item.sourceId) === pageId));
      if (matchingRecords.length > 1) {
        try { await updateNotionPage(pageId, dataSource, { syncStatus: "Conflict" }, notionToken); } catch { /* report the duplicate source mapping */ }
        return json({ error: "Multiple CMS records map to this Notion page. Resolve the duplicate mapping before publishing.", code: "duplicate_cms_mapping" }, { status: 409 });
      }
      const existing = findLinkedRecord(allRecords, pageId);
      const mappedByCmsId = cmsId ? allRecords.find((item) => item.id === cmsId) : undefined;
      if (cmsId && (!existing || mappedByCmsId !== existing)) {
        try { await updateNotionPage(pageId, dataSource, { syncStatus: "Conflict" }, notionToken); } catch { /* report the identity conflict */ }
        return json({ error: "The Notion CMS ID does not match this page's stored source identity. No record was updated.", code: "cms_mapping_mismatch" }, { status: 409 });
      }
      if (permission.status === "Published") {
        if (!existing || !existing.sourceSnapshot) {
          try { await updateNotionPage(pageId, dataSource, { syncStatus: "Conflict" }, notionToken); } catch { /* report the missing mapping */ }
          return json({ error: "Published page has no matching RADARSite sync record.", code: "reapproval_required" }, { status: 409 });
        }
        if (existing.sourceSnapshotHash && existing.sourceSnapshotHash !== sourceFingerprint(existing)) {
          try { await updateNotionPage(pageId, dataSource, { syncStatus: "Conflict" }, notionToken); } catch { /* report inconsistent metadata */ }
          return json({ error: "Stored CMS sync metadata is inconsistent; no content was overwritten.", code: "sync_metadata_conflict" }, { status: 409 });
        }
        const incoming = toPublishedRecord(page, dataSource, rendered.html, existing, featuredImage);
        const conflicts = detectNotionCmsConflicts(existing, incoming);
        if (conflicts.length) {
          try { await updateNotionPage(pageId, dataSource, { syncStatus: "Conflict" }, notionToken); } catch { /* report the CMS conflict */ }
          return json({ error: "RADARSite contains editorial changes that conflict with this Notion revision.", code: "cms_conflict", fields: conflicts }, { status: 409 });
        }
        if (sourceFingerprint(existing) !== sourceFingerprint(incoming)) {
          try { await updateNotionPage(pageId, dataSource, { syncStatus: "Conflict" }, notionToken); } catch { /* approval requirement remains in the API response */ }
          return json({ error: "Published content changed in Notion. Set Status back to Approved before applying updates.", code: "reapproval_required" }, { status: 409 });
        }
        await assertNotionSourceCurrent(expectedNotionPage, expectedNotionStatus, draft, rendered, dataSource, notionToken);
        const unchanged = await writeNotionSyncResult(pageId, dataSource, notionToken, { status: "Published", syncStatus: "Synced", cmsId: existing.id, notionPageId: pageId, canonicalUrl: String(existing.canonicalUrl || ""), syncedAt: String(existing.lastSyncedAt || new Date().toISOString()) });
        if (!unchanged) return json({ error: "Published content remains unchanged, but Notion sync metadata could not be confirmed. Retry the same page.", code: "notion_finalization_failed", cmsId: existing.id }, { status: 502 });
        return json({ ok: true, idempotent: true, pageId, cmsId: existing.id, canonicalUrl: existing.canonicalUrl || "", notionUpdated: unchanged });
      }
      if (permission.status === "Publishing" && !existing) {
        try { await updateNotionPage(pageId, dataSource, { syncStatus: "Conflict" }, notionToken); } catch { /* report the missing resume record */ }
        return json({ error: "Publishing can only be resumed when the RADARSite CMS record already exists.", code: "resume_record_missing" }, { status: 409 });
      }
      if (existing && (!existing.sourceSnapshot || typeof existing.sourceSnapshot !== "object")) {
        try { await updateNotionPage(pageId, dataSource, { syncStatus: "Conflict" }, notionToken); } catch { /* report the mapping safety failure */ }
        return json({ error: "The linked CMS record has no prior source snapshot; reconcile it manually before enabling updates.", code: "sync_snapshot_missing" }, { status: 409 });
      }
      let incoming: CmsRecord;
      try { incoming = toPublishedRecord(page, dataSource, rendered.html, existing, featuredImage); }
      catch (error) { throw apiError(error instanceof Error ? error.message.slice(0, 300) : "The article does not meet the RADARSite content requirements.", 422, "editorial_content_invalid"); }
      const syncTimestamp = new Date().toISOString();
      incoming.lastSyncedAt = syncTimestamp;
      const conflicts = existing ? detectNotionCmsConflicts(existing, incoming) : [];
      if (conflicts.length) {
        conflictDetails = conflicts;
        try { await updateNotionPage(pageId, dataSource, { syncStatus: "Conflict" }, notionToken); } catch { /* surface conflict without hiding it if Notion writeback is unavailable */ }
        return json({ error: "RADARSite contains editorial changes that conflict with this Notion revision.", code: "cms_conflict", fields: conflicts }, { status: 409 });
      }
      const collisions = cmsContentCollisions(allRecords, incoming, existing);
      if (collisions.length) {
        try { await updateNotionPage(pageId, dataSource, { syncStatus: "Conflict" }, notionToken); } catch { /* collision remains visible in the API response */ }
        return json({ error: "The Notion article conflicts with an existing CMS record.", code: "cms_collision", fields: collisions }, { status: 409 });
      }
      const content = replaceCollection(snapshot.content, incoming, existing);
      const nextFingerprint = sourceFingerprint(incoming);
      const priorFingerprint = typeof existing?.sourceSnapshotHash === "string" ? existing.sourceSnapshotHash : "";
      if (existing && priorFingerprint && priorFingerprint !== sourceFingerprint(existing)) {
        try { await updateNotionPage(pageId, dataSource, { syncStatus: "Conflict" }, notionToken); } catch { /* conflict remains visible in the API result */ }
        return json({ error: "Stored CMS sync metadata is inconsistent; no content was overwritten.", code: "sync_metadata_conflict" }, { status: 409 });
      }
      if (existing && priorFingerprint === nextFingerprint && permission.status === "Publishing") {
        finalArticle = existing;
        finalContent = snapshot.content;
        syncAt = new Date().toISOString();
        break;
      }
      if (permission.status === "Publishing" && existing && priorFingerprint !== nextFingerprint) {
        try { await updateNotionPage(pageId, dataSource, { syncStatus: "Conflict" }, notionToken); } catch { /* preserve the editor's current approval state */ }
        return json({ error: "Notion content changed while a prior publication was incomplete. Review the page before approving it again.", code: "reapproval_required" }, { status: 409 });
      }
      expectedNotionPage = await assertNotionSourceCurrent(expectedNotionPage, expectedNotionStatus, draft, rendered, dataSource, notionToken);
      try {
        expectedNotionPage = await updateNotionPage(pageId, dataSource, { status: "Publishing", syncStatus: "Syncing" }, notionToken);
        expectedNotionStatus = "Publishing";
      } catch (error) { throw apiError(error instanceof Error ? error.message : "Notion could not enter Publishing state.", 502, "notion_status_update_failed"); }
      expectedNotionPage = await assertNotionSourceCurrent(expectedNotionPage, expectedNotionStatus, draft, rendered, dataSource, notionToken);
      let written: boolean;
      try { written = await notionPublishRuntime.writeContentIfUnchanged(snapshot.revision, content); }
      catch {
        try {
          await assertNotionSourceCurrent(expectedNotionPage, expectedNotionStatus, draft, rendered, dataSource, notionToken);
          await updateNotionPage(pageId, dataSource, { status: permission.status, syncStatus: "Failed" }, notionToken);
        } catch { /* never overwrite a newer editor state while recovering */ }
        throw apiError("The CMS write failed; Notion was returned to its prior status when possible.", 503, "cms_write_failed");
      }
      if (!written) {
        if (attempt < 2) continue;
        conflictDetails = ["concurrent CMS update"];
        try { await updateNotionPage(pageId, dataSource, { syncStatus: "Conflict" }, notionToken); } catch { /* report the CAS conflict without changing editorial status */ }
        return json({ error: "CMS content changed concurrently; no update was applied. Retry after review.", code: "concurrent_cms_update", fields: conflictDetails }, { status: 409 });
      }
      finalArticle = incoming;
      finalContent = content;
      syncAt = syncTimestamp;
      break;
    }
    if (!finalArticle || !finalContent) throw apiError("CMS synchronization did not complete.", 503, "cms_sync_unavailable");

    const syncRun = `notion-publish:${pageId}`;
    const desiredRelationships = new Map<string, Parameters<typeof notionPublishRuntime.upsertMediaRelationship>[0]>();
    for (const [blockId, image] of imported) {
      const featuredRole = blockId === "featured-image";
      const placementIndex = featuredRole ? undefined : rendered.images.find((item) => item.blockId === blockId)?.placementIndex;
      const relationship = {
        mediaId: image.id, contentKey: `notion:${pageId}`, contentSourceProvider: "notion", contentSourceId: pageId,
        role: featuredRole ? "featured" as const : "inline" as const,
        ...(featuredRole ? {} : { placementIndex: placementIndex ?? 0 }),
        sourceLocator: `notion:block:${blockId}`, migrationRunId: syncRun,
        provenance: { mediaKey: image.key, checksum: image.checksum, sourceUrl: image.sourceUrl },
      };
      const id = createMediaRelationshipId(relationship);
      desiredRelationships.set(id, { ...relationship, id });
    }
    try {
      const existingRelationships = await notionPublishRuntime.listMediaRelationshipsByContent(`notion:${pageId}`);
      for (const relation of existingRelationships) {
        // An empty Featured Image URL means preserve the current featured asset.
        if (relation.role === "featured" && !featuredSource) continue;
        if (!desiredRelationships.has(relation.id)) await notionPublishRuntime.deleteMediaRelationship(relation.id);
      }
      for (const relation of desiredRelationships.values()) await notionPublishRuntime.upsertMediaRelationship(relation);
    } catch {
      try { await updateNotionPage(pageId, dataSource, { syncStatus: "Failed" }, notionToken); } catch { /* retry through the stable Notion/CMS identity without changing editorial status */ }
      throw apiError("CMS content was saved, but media association failed. The editor's Status was preserved; retry after checking media storage.", 503, "media_relationship_failed");
    }
    const syncedAt = syncAt || new Date().toISOString();
    try {
      notionPublishRuntime.revalidateTag(notionPublishRuntime.contentCacheTag(), { expire: 0 });
      notionPublishRuntime.revalidatePath(articlePath(finalArticle));
      notionPublishRuntime.revalidatePath("/ontheradar/articles");
      notionPublishRuntime.revalidatePath("/ontheradar");
      if (finalArticle.editorialType === "Magazine") notionPublishRuntime.revalidatePath("/ontheradar/magazine");
      if (finalArticle.projectSection === "Motherland") notionPublishRuntime.revalidatePath("/motherland");
    } catch {
      try { await updateNotionPage(pageId, dataSource, { syncStatus: "Failed" }, notionToken); } catch { /* retry through the stable Notion/CMS identity without changing editorial status */ }
      throw apiError("CMS content was saved, but cache revalidation failed. The editor's Status was preserved; retry or review deployment logs.", 503, "cache_revalidation_failed");
    }
    try {
      await assertNotionSourceCurrent(expectedNotionPage, expectedNotionStatus, draft, rendered, dataSource, notionToken);
      await updateNotionPage(pageId, dataSource, { status: "Published", syncStatus: "Synced", cmsId: finalArticle.id, notionPageId: pageId, canonicalUrl: String(finalArticle.canonicalUrl || ""), syncedAt }, notionToken);
    } catch {
      return json({ error: "RADARSite content was saved, but Notion status writeback failed. Retry the same page to finish idempotently.", code: "notion_finalization_failed", cmsId: finalArticle.id }, { status: 502 });
    }
    return json({ ok: true, pageId, cmsId: finalArticle.id, slug: finalArticle.slug, canonicalUrl: finalArticle.canonicalUrl || "", status: "Published", syncStatus: "Synced", importedImages: imported.size, cacheRevalidated: true });
  } catch (error) {
    const typed = error as ApiError;
    const status = typeof typed.status === "number" ? typed.status : 502;
    const code = typed.code || "notion_sync_failed";
    console.error("[notion-publish] synchronization failed", { code, status, name: error instanceof Error ? error.name : "UnknownError" });
    return json({ error: typed.code ? typed.message.slice(0, 500) : "Notion publishing failed because an internal service operation failed. Check secure server logs.", code }, { status });
  }
}

async function writeNotionSyncResult(pageId: string, dataSource: NotionDataSource, token: string, values: Parameters<typeof buildNotionPageUpdates>[1]): Promise<boolean> {
  try { await updateNotionPage(pageId, dataSource, values, token); return true; }
  catch (error) { console.error("[notion-publish] idempotent finalization failed", { name: error instanceof Error ? error.name : "UnknownError" }); return false; }
}
