import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/request-security";
import { stageNotionMediaPages } from "../../../../../../scripts/stage-notion-media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 2 * 1024;
const MAX_REQUESTS_PER_MINUTE = 2;
const AFFECTED_PAGE_IDS = [
  "3ff58434-c727-81c6-acc7-e3a3e98cf593",
  "3fb58434-c727-8193-ab8e-dfa1d75a6ab2",
] as const;

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

async function readBody(request: NextRequest): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) throw new Error("payload_too_large");
  const text = await request.text();
  if (!text.trim()) return {};
  if (Buffer.byteLength(text, "utf8") > MAX_REQUEST_BYTES) throw new Error("payload_too_large");
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid_payload");
  return parsed as Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  if (process.env.RADAR_NOTION_PUBLISHING_ENABLED !== "true") return json({ error: "Notion publishing is disabled in this environment.", code: "integration_disabled" }, { status: 503 });
  if (!rateLimit(request, "notion-media-stage", MAX_REQUESTS_PER_MINUTE).allowed) return json({ error: "Too many staging requests. Try again later." }, { status: 429, headers: { "Retry-After": "60" } });
  if (!bearerMatches(request)) return json({ error: "Integration authorization required.", code: "unauthorized" }, { status: 401 });
  try {
    const payload = await readBody(request);
    if (Object.keys(payload).length > 0) return json({ error: "This endpoint stages only the two approved affected article pages.", code: "fixed_scope" }, { status: 400 });
    const result = await stageNotionMediaPages({ apply: true, keepTemp: false, manifestPath: "/tmp/notion-media-staging-manifest.json", pages: [...AFFECTED_PAGE_IDS] });
    return json({ ok: true, pages: result.pages, assetCount: result.assetCount, manifestKey: "content/notion-media-staging-v1.json", assets: result.assets });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = message === "payload_too_large" ? "payload_too_large" : message === "invalid_payload" ? "invalid_payload" : "media_staging_failed";
    const status = code === "payload_too_large" ? 413 : code === "invalid_payload" ? 400 : 502;
    console.error("[notion-media-stage] staging failed", { code, name: error instanceof Error ? error.name : "UnknownError" });
    return json({ error: "Notion media staging failed. Check secure server logs.", code }, { status });
  }
}
