import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { readContent } from "@/lib/content-server";
import type { CmsRecord } from "@/lib/content-server";
import {
  resolveArticleItinerary, routeArticle, routePublishedArticles, verifyArticleRouting,
} from "@/lib/article-routing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_REQUESTS_PER_MINUTE = 20;
const windowState = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string) {
  const now = Date.now();
  const current = windowState.get(key);
  if (!current || current.resetAt < now) {
    windowState.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS_PER_MINUTE;
}

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

/** Shares the Notion sync secret so the routing agent has exactly one credential to rotate. */
function authorized(request: NextRequest) {
  const expected = process.env.RADAR_NOTION_SYNC_SECRET || "";
  const supplied = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!expected || !supplied) return false;
  return timingSafeEqual(createHash("sha256").update(expected).digest(), createHash("sha256").update(supplied).digest());
}

function findArticle(content: { articles: unknown[]; magazine: unknown[] }, slug: string): CmsRecord | null {
  const records = [...content.articles, ...content.magazine] as CmsRecord[];
  return records.find((record) => record.slug === slug) || null;
}

/**
 * POST /api/internal/routing
 *
 *   { "slug": "..." }                  route one published article
 *   { "sweep": true, "limit": 25 }     reconcile every published article
 *   { "dryRun": true }                 report the itinerary without dispatching
 *
 * GET /api/internal/routing?slug=...   verify live reachability at every stop
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) return json({ error: "Integration authorization required.", code: "unauthorized" }, { status: 401 });
  const identity = request.headers.get("x-forwarded-for") || "unknown";
  if (rateLimited(identity)) return json({ error: "Too many routing requests." }, { status: 429 });

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const content = await readContent({ fallbackToSnapshot: false });
  const dryRun = payload.dryRun === true;
  const fetcher = fetch;

  if (payload.sweep === true) {
    const limit = Number.isFinite(Number(payload.limit)) ? Math.min(100, Math.max(1, Number(payload.limit))) : 25;
    const reports = await routePublishedArticles(content, { dryRun, fetcher, limit });
    return json({
      swept: reports.length,
      complete: reports.filter((report) => report.complete).length,
      incomplete: reports.filter((report) => !report.complete).map((report) => ({ slug: report.slug, blocked: report.blocked })),
    });
  }

  const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";
  if (!slug) return json({ error: "Provide a slug, or set sweep=true." }, { status: 400 });
  const article = findArticle(content, slug);
  if (!article) return json({ error: `No published record for slug "${slug}".`, code: "article_not_found" }, { status: 404 });

  const report = await routeArticle(article, { dryRun, fetcher, force: payload.force === true });
  return json(report);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return json({ error: "Integration authorization required.", code: "unauthorized" }, { status: 401 });
  const slug = new URL(request.url).searchParams.get("slug")?.trim() || "";
  if (!slug) return json({ error: "Provide ?slug=." }, { status: 400 });
  const content = await readContent({ fallbackToSnapshot: false });
  const article = findArticle(content, slug);
  if (!article) return json({ error: `No published record for slug "${slug}".` }, { status: 404 });
  const itinerary = resolveArticleItinerary(article);
  return json(await verifyArticleRouting(itinerary));
}
