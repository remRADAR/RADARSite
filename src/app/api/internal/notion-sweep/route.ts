import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { POST as notionPublishPost } from "@/app/api/integrations/notion/publish/route";
import { readContent } from "@/lib/content-server";
import { routePublishedArticles } from "@/lib/article-routing";
import {
  EDITORIAL_PROPERTY_NAMES, NOTION_API_VERSION, normalizeNotionPageId, readNotionProperty,
  type NotionPage,
} from "@/lib/notion-editorial-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET/POST /api/internal/notion-sweep
 *
 * Safety net for the event wire. Notion does not retry a webhook forever, and one
 * dropped delivery must not leave an approved article unpublished. Designed to be
 * driven by a Cloudflare Cron Trigger: it asks Notion which pages are currently
 * approved AND publish-checked, publishes any the CMS does not know about yet, then
 * reconciles routing for everything published.
 *
 * The page-selection rule is deliberately the same approval contract the publish
 * runtime enforces (`Publish to RADARSite` checked + a publishable Status), so the
 * sweeper can never publish something a human did not approve.
 */
function authorized(request: NextRequest) {
  const expected = process.env.RADAR_NOTION_SYNC_SECRET || "";
  const supplied = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]
    || new URL(request.url).searchParams.get("secret")
    || "";
  if (!expected || !supplied) return false;
  return timingSafeEqual(createHash("sha256").update(expected).digest(), createHash("sha256").update(supplied).digest());
}

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

const PUBLISHABLE_STATUSES = ["Approved", "Publishing", "Published"];

async function approvedPageIds(token: string, dataSourceId: string) {
  const response = await fetch(`https://api.notion.com/v1/data_sources/${encodeURIComponent(dataSourceId)}/query`, {
    method: "POST",
    cache: "no-store",
    redirect: "error",
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": NOTION_API_VERSION, "content-type": "application/json" },
    body: JSON.stringify({ page_size: 100 }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Notion data-source query failed with HTTP ${response.status}`);
  const payload = await response.json() as { results?: NotionPage[] };
  const ids: string[] = [];
  for (const page of payload.results || []) {
    const status = String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.status) || "");
    const publishChecked = readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.publish) === true;
    if (!publishChecked || !PUBLISHABLE_STATUSES.includes(status)) continue;
    const scheduledAt = String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.scheduledAt) || "");
    if (scheduledAt) {
      const time = Date.parse(scheduledAt);
      if (Number.isFinite(time) && time > Date.now()) continue; // not due yet
    }
    const id = normalizeNotionPageId(page.id);
    if (id) ids.push(id);
  }
  return ids;
}

async function publishOne(request: NextRequest, pageId: string) {
  const syncSecret = process.env.RADAR_NOTION_SYNC_SECRET || "";
  const inner = new NextRequest(new URL("/api/integrations/notion/publish", request.url), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${syncSecret}` },
    body: JSON.stringify({ pageId }),
  });
  const response = await notionPublishPost(inner);
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  return { pageId, status: response.status, ok: response.ok, slug: typeof body.slug === "string" ? body.slug : "", detail: response.ok ? "" : String(body.error || "") };
}

async function sweep(request: NextRequest, dryRun: boolean) {
  if (process.env.RADAR_NOTION_PUBLISHING_ENABLED !== "true") {
    return json({ error: "Notion publishing is disabled in this environment.", code: "integration_disabled" }, { status: 503 });
  }
  if (!authorized(request)) return json({ error: "Integration authorization required.", code: "unauthorized" }, { status: 401 });

  const token = process.env.NOTION_API_KEY || "";
  const dataSourceId = normalizeNotionPageId(process.env.RADAR_NOTION_DATA_SOURCE_ID);
  if (!token || !dataSourceId) {
    return json({
      error: "Notion configuration is incomplete.",
      code: "configuration_missing",
      requiredEnv: ["NOTION_API_KEY", "RADAR_NOTION_DATA_SOURCE_ID", "RADAR_NOTION_SYNC_SECRET"].filter((key) => !process.env[key]),
    }, { status: 503 });
  }

  const content = await readContent({ fallbackToSnapshot: false });
  const knownPageIds = new Set(
    ([...content.articles, ...content.magazine] as Record<string, unknown>[])
      .map((item) => normalizeNotionPageId(item.notionPageId || item.sourceId))
      .filter((value): value is string => Boolean(value)),
  );

  const approved = await approvedPageIds(token, dataSourceId).catch(() => [] as string[]);
  const outstanding = approved.filter((id) => !knownPageIds.has(id));

  const published: Awaited<ReturnType<typeof publishOne>>[] = [];
  if (!dryRun) {
    for (const pageId of outstanding.slice(0, 10)) published.push(await publishOne(request, pageId));
  }

  const refreshed = dryRun ? content : await readContent({ fallbackToSnapshot: false });
  const reports = await routePublishedArticles(refreshed, { dryRun, limit: 50 });

  return json({
    approved: approved.length,
    outstanding: outstanding.length,
    published,
    routed: reports.length,
    complete: reports.filter((report) => report.complete).length,
    incomplete: reports.filter((report) => !report.complete).map((report) => ({ slug: report.slug, blocked: report.blocked })),
  });
}

export async function GET(request: NextRequest) {
  return sweep(request, new URL(request.url).searchParams.get("dryRun") === "true");
}

export async function POST(request: NextRequest) {
  let dryRun = false;
  try {
    dryRun = ((await request.json()) as Record<string, unknown>).dryRun === true;
  } catch {
    /* empty body is fine */
  }
  return sweep(request, dryRun);
}
