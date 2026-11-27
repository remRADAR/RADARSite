/**
 * Notion image backfill — the shared engine behind both the manual repair
 * endpoint and the automatic sweep.
 *
 * Keeping it here (rather than inside the route) means the same code path runs
 * whether a human triggers a repair or the Cloudflare Cron sweep does it, so
 * the two can never drift apart.
 */

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

export type ImageRepairReport = {
  slug: string;
  cmsId: string;
  notionPageId: string;
  temporaryUrls: number;
  replaced: number;
  unresolved: Array<{ field: string; url: string }>;
  written: boolean;
  error?: string;
};

export type ImageBackfillResult = {
  ok: boolean;
  dryRun: boolean;
  scanned: number;
  affected: number;
  repaired: number;
  failed: number;
  reports: ImageRepairReport[];
  /** Set when the run could not start at all (missing config). */
  blockedBy?: string;
  requiredEnv?: string[];
};

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

/** Repair one record. Never writes a partially repaired record. */
export async function repairRecordImages(
  record: CmsRecord,
  token: string,
  dryRun: boolean,
): Promise<ImageRepairReport> {
  const slug = String(record.slug || "");
  const cmsId = String(record.id || "");
  const notionPageId = normalizeNotionPageId(record.notionPageId || record.sourceId) || "";
  const temporary = findTemporaryNotionImagesInRecord(record as Record<string, unknown>);
  const base: ImageRepairReport = { slug, cmsId, notionPageId, temporaryUrls: temporary.length, replaced: 0, unresolved: [], written: false };

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
    const identities = new Set(sources.map((source) => source.identity));
    const resolvable = temporary.filter((item) => identities.has(item.url.split("?")[0]));
    return {
      ...base,
      replaced: resolvable.length,
      unresolved: temporary.filter((item) => !identities.has(item.url.split("?")[0])).map((item) => ({ field: item.field, url: item.url })),
    };
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
    return {
      ...base,
      unresolved: outcome.unresolved,
      error: outcome.unresolved.length ? "No temporary URL could be matched to a Notion image." : "Nothing to repair.",
    };
  }

  // A partial repair is worse than none: it hides the remaining breakage.
  const blocker = temporaryNotionImageBlocker(outcome.record);
  if (blocker) {
    return { ...base, replaced: outcome.replaced.length, unresolved: outcome.unresolved, error: blocker };
  }

  const snapshot = await readContentWriteSnapshot();
  const current = snapshot.content;
  const existing = ([...current.articles, ...current.magazine] as CmsRecord[]).find((item) => item.id === cmsId);
  if (!existing) {
    return { ...base, replaced: outcome.replaced.length, unresolved: outcome.unresolved, error: "Record disappeared from the CMS before it could be written." };
  }

  const repaired: CmsRecord = { ...existing, ...outcome.record } as CmsRecord;
  const next: ContentCollections = {
    ...current,
    articles: current.articles.map((item) => ((item as CmsRecord).id === cmsId ? repaired : item)) as ContentCollections["articles"],
    magazine: current.magazine.map((item) => ((item as CmsRecord).id === cmsId ? repaired : item)) as ContentCollections["magazine"],
  };
  const written = await writeContentIfUnchanged(snapshot.revision, next);
  if (!written) {
    return { ...base, replaced: outcome.replaced.length, unresolved: outcome.unresolved, error: "CMS changed concurrently; retry." };
  }

  try {
    revalidateTag(contentCacheTag(), { expire: 0 });
    revalidatePath(articlePath(repaired));
    revalidatePath("/ontheradar/articles");
    revalidatePath("/");
  } catch { /* the content write already succeeded; cache will expire on its own */ }

  return { ...base, replaced: outcome.replaced.length, unresolved: outcome.unresolved, written: true };
}

/**
 * Repair every live record that still carries a temporary Notion image URL.
 *
 * Idempotent: a clean CMS is a no-op. Safe to call on every sweep.
 */
export async function backfillNotionImages(options: { token?: string; dryRun?: boolean; onlySlugs?: string[] } = {}): Promise<ImageBackfillResult> {
  const dryRun = options.dryRun === true;
  const onlySlugs = options.onlySlugs || [];
  const token = options.token || process.env.NOTION_API_KEY || "";

  if (!token) {
    return { ok: false, dryRun, scanned: 0, affected: 0, repaired: 0, failed: 0, reports: [], blockedBy: "NOTION_API_KEY is not configured.", requiredEnv: ["NOTION_API_KEY"] };
  }
  if (!notionR2ConfigurationReady()) {
    return {
      ok: false, dryRun, scanned: 0, affected: 0, repaired: 0, failed: 0, reports: [],
      blockedBy: "Cloudflare R2 public-media configuration is incomplete; images cannot be stored.",
      requiredEnv: ["R2_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_PUBLIC_BASE_URL"],
    };
  }

  const snapshot = await readContentWriteSnapshot();
  const records = [...snapshot.content.articles, ...snapshot.content.magazine] as CmsRecord[];
  const affected = records.filter((record) => {
    if (onlySlugs.length && !onlySlugs.includes(String(record.slug || ""))) return false;
    return findTemporaryNotionImagesInRecord(record as Record<string, unknown>).length > 0;
  });

  const reports: ImageRepairReport[] = [];
  for (const record of affected) {
    try {
      reports.push(await repairRecordImages(record, token, dryRun));
    } catch (error) {
      reports.push({
        slug: String(record.slug || ""), cmsId: String(record.id || ""),
        notionPageId: String(record.notionPageId || ""), temporaryUrls: 0, replaced: 0, unresolved: [], written: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    ok: true,
    dryRun,
    scanned: records.length,
    affected: affected.length,
    repaired: reports.filter((report) => report.written).length,
    failed: reports.filter((report) => !report.written && report.error).length,
    reports,
  };
}

/** Read-only inventory of live records still carrying a temporary Notion URL. */
export async function inventoryTemporaryNotionImages() {
  const snapshot = await readContentWriteSnapshot();
  const records = [...snapshot.content.articles, ...snapshot.content.magazine] as CmsRecord[];
  const affected = records
    .map((record) => ({ slug: String(record.slug || ""), cmsId: String(record.id || ""), images: findTemporaryNotionImagesInRecord(record as Record<string, unknown>) }))
    .filter((item) => item.images.length > 0);
  return { scanned: records.length, affected: affected.length, records: affected };
}
