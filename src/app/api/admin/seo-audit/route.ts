import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName, isSessionValid } from "@/lib/studio-server";
import { isSameOriginMutation, rateLimit } from "@/lib/request-security";
import { readPublicContent } from "@/lib/content-server";
import { auditPath, createAuditContext } from "@/lib/seo-audit/audit-engine";
import { normalizeAuditPath } from "@/lib/seo-audit/url-validation";
import { fetchPublicPage } from "@/lib/seo-audit/live-fetch";
import { hasAuditDatabase, listAuditRuns, saveAuditRun } from "@/lib/seo-audit/storage";
import type { AuditCategory, AuditSeverity } from "@/lib/seo-audit/types";

const MAX_URLS_PER_SCAN = 10;

/**
 * POST /api/admin/seo-audit
 * Request:  { "urls": string[] }            (1-10 site URLs or paths)
 * Response: { "success": true, "persisted": boolean, "reports": AuditReport[] }
 *           400 { "success": false, "errors": [{ "input": string, "error": string }] }
 *           401/403/429 as documented in docs/seo-auditor.md
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ success: false, error: "Cross-origin mutation rejected" }, { status: 403 });
  if (!isSessionValid(request.cookies.get(getSessionCookieName())?.value)) return NextResponse.json({ success: false, error: "Admin authentication required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const limit = rateLimit(request, "seo-audit", 20);
  if (!limit.allowed) return NextResponse.json({ success: false, error: "Rate limit exceeded", retryAfter: limit.retryAfter }, { status: 429, headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" } });

  const body = await request.json().catch(() => null) as { urls?: unknown } | null;
  if (!body || !Array.isArray(body.urls) || body.urls.length < 1) {
    return NextResponse.json({ success: false, error: "Provide an array of 1-10 URLs to audit" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (body.urls.length > MAX_URLS_PER_SCAN) {
    return NextResponse.json({ success: false, error: `At most ${MAX_URLS_PER_SCAN} URLs per scan` }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const seen = new Set<string>();
  const errors: { input: string; error: string }[] = [];
  const paths: string[] = [];
  for (const input of body.urls) {
    if (typeof input !== "string") { errors.push({ input: String(input), error: "URL must be a string" }); continue; }
    const normalized = normalizeAuditPath(input);
    if (!normalized.ok) { errors.push({ input, error: normalized.error }); continue; }
    if (!seen.has(normalized.path)) { seen.add(normalized.path); paths.push(normalized.path); }
  }
  if (errors.length) return NextResponse.json({ success: false, errors }, { status: 400, headers: { "Cache-Control": "no-store" } });
  if (!paths.length) return NextResponse.json({ success: false, error: "No valid URLs after deduplication" }, { status: 400, headers: { "Cache-Control": "no-store" } });

  const content = await readPublicContent();
  const context = createAuditContext(content);
  const reports = [];
  for (const path of paths) {
    const report = await auditPath(context, path, { liveFetch: fetchPublicPage });
    await saveAuditRun(report).catch(() => null);
    reports.push(report);
  }
  return NextResponse.json({ success: true, persisted: hasAuditDatabase(), reports }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * GET /api/admin/seo-audit?path=&severity=&category=&limit=
 * Response: { "success": true, "persisted": boolean, "runs": AuditRunRow[] }
 */
export async function GET(request: NextRequest) {
  if (!isSessionValid(request.cookies.get(getSessionCookieName())?.value)) return NextResponse.json({ success: false, error: "Admin authentication required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const url = new URL(request.url);
  const path = url.searchParams.get("path") || undefined;
  const severity = (url.searchParams.get("severity") || undefined) as AuditSeverity | undefined;
  const category = (url.searchParams.get("category") || undefined) as AuditCategory | undefined;
  const limit = Number(url.searchParams.get("limit")) || 25;
  const runs = await listAuditRuns({ path, severity, category, limit }).catch(() => []);
  return NextResponse.json({ success: true, persisted: hasAuditDatabase(), runs }, { headers: { "Cache-Control": "no-store" } });
}
