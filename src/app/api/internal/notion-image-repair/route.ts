import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { backfillNotionImages, inventoryTemporaryNotionImages } from "@/lib/notion-image-backfill";
import { rateLimit } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * /api/internal/notion-image-repair
 *
 * Repairs articles that are already live with temporary Notion image URLs.
 *
 * This is the manual trigger for the engine in `notion-image-backfill.ts`. The
 * same engine also runs automatically at the end of every `/api/internal/notion-sweep`
 * pass, so a temporary link that slips through is healed without anyone asking.
 *
 * Safe to run any number of times:
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
 * `{"dryRun": true}` reports what would change without writing anything.
 * `GET` is a read-only inventory of affected records.
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

export async function POST(request: NextRequest) {
  if (process.env.RADAR_NOTION_PUBLISHING_ENABLED !== "true") {
    return json({ error: "Notion publishing is disabled in this environment.", code: "integration_disabled" }, { status: 503 });
  }
  if (!rateLimit(request, "notion-image-repair", MAX_REQUESTS_PER_MINUTE).allowed) {
    return json({ error: "Too many repair requests. Try again later." }, { status: 429, headers: { "Retry-After": "60" } });
  }
  if (!bearerMatches(request)) return json({ error: "Integration authorization required.", code: "unauthorized" }, { status: 401 });

  let dryRun = false;
  let onlySlugs: string[] = [];
  try {
    const body = await request.json() as Record<string, unknown>;
    dryRun = body?.dryRun === true;
    if (Array.isArray(body?.slugs)) onlySlugs = body.slugs.filter((item): item is string => typeof item === "string");
  } catch { /* empty body means: repair everything */ }

  const result = await backfillNotionImages({ dryRun, onlySlugs });
  if (!result.ok) {
    return json({ error: result.blockedBy, code: "configuration_missing", requiredEnv: result.requiredEnv }, { status: 503 });
  }
  return json(result);
}

export async function GET(request: NextRequest) {
  // Read-only inventory: which live records still carry a temporary Notion URL.
  if (!bearerMatches(request)) return json({ error: "Integration authorization required.", code: "unauthorized" }, { status: 401 });
  const inventory = await inventoryTemporaryNotionImages();
  return json({ ok: true, ...inventory });
}
