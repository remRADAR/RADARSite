import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  contentCacheTag, readContentWriteSnapshot, writeContentIfUnchanged,
  type CmsRecord, type ContentCollections,
} from "@/lib/content-server";
import { articlePath } from "@/lib/editorial-normalization";
import { findTemporaryNotionImagesInRecord, temporaryNotionImageBlocker } from "@/lib/notion-image-hygiene";
import { repairRecordNotionImages, type NotionImageSource } from "@/lib/notion-image-repair";
import { importNotionImage, notionR2ConfigurationReady } from "@/lib/notion-media";
import {
  NOTION_API_VERSION, collectNotionImageSources, normalizeNotionPageId,
  type NotionBlock, type NotionPage,
} from "@/lib/notion-editorial-sync";
import { rateLimit } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/internal/notion-image-repair
 *
 * Repairs articles that are already live with temporary Notion image URLs.
 *
 * This is the one-time (and repeatable) backfill for the engine in
 * `notion-image-repair.ts`. It is safe to run any number of times:
 *
 *   - it only touches records that actually contain a temporary Notion URL,
 *   - it re-reads the Notion page to obtain a *fresh* signed URL for each file
 *     (the stored one has usually expired by the time anyone notices),
 *   - it imports each image into Cloudflare R2 and rewrites the stored HTML to
 *     the R2 delivery URL,
 *   - it writes with the same compare-and-swap guard the publish path uses, so
 *     a concurrent editorial change is never clobbered,
 *   - a record it cannot fully repair is left untouched and reported, never
 *     half-rewritten.
 *
 * `dryRun: true` reports what would change without writing anything.
 */

const MAX_REQUESTS_PER_MINUTE = 4;

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function bearerMatches(request: NextRequest): boolean {
  const expected = process.env.RADAR_NOTION_SYNC_SECRET || "";
  const supplied = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!expected || !supplied) return false;
  return timingSafeEqual(createHash("sha256").update(expected).digest(), createHash("sha256").update(supplied).digest());
}

async function notionJson<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "error",
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": NOTION_API_VERSION, accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Notion API request failed with HTTP ${response.status}.`);
  return await response.json() as T;
}

async function notionChildren(blockId: string, token: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor = "";
  const seen = new Set<string>();
  do {
    const query = new URLSearchParams({ page_size: "100" });
    if (cursor) query.set("start_cursor", cursor);
    const page = await notionJson<{ results?: NotionBlock[]; has_more?: boolean; next_cursor?: string | null }>(
      `https://api.notion.com/v1/blocks/${encodeURIComponent(blockId)}/children?${query}`, token,
    );
    if (!Array.isArray(page.results)) throw new Error("Notion returned an invalid block list.");
    blocks.push(...page.results);
    if (blocks.length > 1500) throw new Error("Notion page exceeds the supported 1,500-block limit.");
    const next = page.next_cursor || "";
    if (page.has_more && (!next || seen.has(next))) throw new Error("Notion pagination returned an invalid cursor.");
    if (next) seen.add(next);
    cursor = page.has_more ? next : "";
  } while (cursor);
  return blocks;
}

type RepairReport = {
  slug: string;
  cmsId: string;
  notionPageId: string;
  temporaryUrls: number;
  replaced: number;
  unresolved: Array<{ field: string; url: string }>;
  written: boolean;
  error?: string;
};

async function repairOne(
  record: CmsRecord,
  token: string,
  dryRun: boolean,
): Promise<RepairReport> {
  const slug = String(record.slug || "");
  const cmsId = String(record.id || "");
  const notionPageId = normalizeNotionPageId(record.notionPageId || record.sourceId) || "";
  const temporary = findTemporaryNotionImagesInRecord(record as Record<string, unknown>);
  const base: RepairReport = { slug, cmsId, notionPageId, temporaryUrls: temporary.length, replaced: 0, unresolved: [], written: false };

  if (!notionPageId) {
    return { ...base, error: "Record has no Notion page identity; its images cannot be re-sourced automatically." };
  }

  let sources: NotionImageSource[];
  try {
    const page = await notionJson<NotionPage>(`https://api.notion.com/v1/pages/${encodeURIComponent(notionPageId)}`, token);
    sources = await collectNotionImageSources(page, (blockId) => notionChildren(blockId, token));
  } catch (error) {
    return { ...base, error: `Could not read the Notion page: ${error instanceof Error ? error.message : String(error)}` };
  }

  if (dryRun) {
    // Report what a real run would do without downloading or uploading anything.
    const identities = new Set(sources.map((source) => source.identity));
    const resolvable = temporary.filter((item) => identities.has(item.url.split("?")[0]));
    return { ...base, replaced: resolvable.length, unresolved: temporary.filter((item) => !identities.has(item.url.split("?")[0])).map((item) => ({ field: item.field, url: item.url })) };
  }

  const outcome = await repairRecordNotionImages(
    record as Record<string, unknown>,
    sources,
    async (source) => {
      const imported = await importNotionImage({
        url: source.sourceUrl,
        pageId: notionPageId,
        blockId: source.blockId,
        alt: source.alt,
      });
      return imported.url;
    },
  );

  if (!outcome.replaced.length) {
    return { ...base, unresolved: outcome.unresolved, error: outcome.unresolved.length ? "No temporary URL could be matched to a Notion image." : "Nothing to repair." };
  }

  // Never write a record that still has a temporary URL: a partial repair is
  // worse than none, because it hides the remaining breakage.
  const blocker = temporaryNotionImageBlocker(outcome.record);
  if (blocker) {
    return { ...base, replaced: outcome.replaced.length, unresolved: outcome.unresolved, error: blocker };
  }

  const snapshot = await readContentWriteSnapshot();
  const current = snapshot.content;
  const existing = ([...current.articles, ...current.magazine] as CmsRecord[]).find((item) => item.id === cmsId);
  if (!existing) return { ...base, replaced: outcome.replaced.length, unresolved: outcome.unresolved, error: "Record disappeared from the CMS before it could be written." };

  const repaired: CmsRecord = { ...existing, ...outcome.record } as CmsRecord;
  const next: ContentCollections = {
    ...current,
    articles: current.articles.map((item) => ((item as CmsRecord).id === cmsId ? repaired : item)) as ContentCollections["articles"],
    magazine: current.magazine.map((item) => ((item as CmsRecord).id === cmsId ? repaired : item)) as ContentCollections["magazine"],
  };
  const written = await writeContentIfUnchanged(snapshot.revision, next);
  if (!written) return { ...base, replaced: outcome.replaced.length, unresolved: outcome.unresolved, error: "CMS changed concurrently; retry." };

  try {
    revalidateTag(contentCacheTag(), { expire: 0 });
    revalidatePath(articlePath(repaired));
    revalidatePath("/ontheradar/articles");
    revalidatePath("/");
  } catch { /* the content write already succeeded; cache will expire on its own */ }

  return { ...base, replaced: outcome.replaced.length, unresolved: outcome.unresolved, written: true };
}

export async function POST(request: NextRequest) {
  if (process.env.RADAR_NOTION_PUBLISHING_ENABLED !== "true") {
    return json({ error: "Notion publishing is disabled in this environment.", code: "integration_disabled" }, { status: 503 });
  }
  if (!rateLimit(request, "notion-image-repair", MAX_REQUESTS_PER_MINUTE).allowed) {
    return json({ error: "Too many repair requests. Try again later." }, { status: 429, headers: { "Retry-After": "60" } });
  }
  if (!bearerMatches(request)) return json({ error: "Integration authorization required.", code: "unauthorized" }, { status: 401 });

  const token = process.env.NOTION_API_KEY || "";
  if (!token) return json({ error: "NOTION_API_KEY is not configured.", code: "configuration_missing", requiredEnv: ["NOTION_API_KEY"] }, { status: 503 });
  if (!notionR2ConfigurationReady()) {
    return json({
      error: "Cloudflare R2 public-media configuration is incomplete; images cannot be stored.",
      code: "r2_not_configured",
      requiredEnv: ["R2_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_PUBLIC_BASE_URL"],
    }, { status: 503 });
  }

  let dryRun = false;
  let onlySlugs: string[] = [];
  try {
    const body = await request.json() as Record<string, unknown>;
    dryRun = body?.dryRun === true;
    if (Array.isArray(body?.slugs)) onlySlugs = body.slugs.filter((item): item is string => typeof item === "string");
  } catch { /* empty body means: repair everything */ }

  const snapshot = await readContentWriteSnapshot();
  const records = [...snapshot.content.articles, ...snapshot.content.magazine] as CmsRecord[];
  const affected = records.filter((record) => {
    if (onlySlugs.length && !onlySlugs.includes(String(record.slug || ""))) return false;
    return findTemporaryNotionImagesInRecord(record as Record<string, unknown>).length > 0;
  });

  const reports: RepairReport[] = [];
  for (const record of affected) {
    try {
      reports.push(await repairOne(record, token, dryRun));
    } catch (error) {
      reports.push({
        slug: String(record.slug || ""), cmsId: String(record.id || ""),
        notionPageId: String(record.notionPageId || ""), temporaryUrls: 0, replaced: 0, unresolved: [], written: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return json({
    ok: true,
    dryRun,
    scanned: records.length,
    affected: affected.length,
    repaired: reports.filter((report) => report.written).length,
    failed: reports.filter((report) => !report.written && report.error).length,
    reports,
  });
}

export async function GET(request: NextRequest) {
  // Read-only inventory: which live records still carry a temporary Notion URL.
  if (!bearerMatches(request)) return json({ error: "Integration authorization required.", code: "unauthorized" }, { status: 401 });
  const snapshot = await readContentWriteSnapshot();
  const records = [...snapshot.content.articles, ...snapshot.content.magazine] as CmsRecord[];
  const affected = records
    .map((record) => ({ slug: String(record.slug || ""), cmsId: String(record.id || ""), images: findTemporaryNotionImagesInRecord(record as Record<string, unknown>) }))
    .filter((item) => item.images.length > 0);
  return json({ ok: true, scanned: records.length, affected: affected.length, records: affected });
}
