import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName, isSessionValid } from "@/lib/studio-server";
import { hasAuditDatabase, getLatestAuditRun } from "@/lib/seo-audit/storage";

/**
 * GET /api/admin/seo-audit/export?path=/ontheradar/articles/x&format=csv|json
 * Response: the latest stored audit run for the path as a downloadable
 * CSV (default) or JSON document. 404 when nothing is stored.
 */
function csvEscape(value: string) {
  return `"${(value || "").replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  if (!isSessionValid(request.cookies.get(getSessionCookieName())?.value)) return NextResponse.json({ success: false, error: "Admin authentication required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  if (!hasAuditDatabase()) return NextResponse.json({ success: false, error: "Audit history persistence requires DATABASE_URL" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const url = new URL(request.url);
  const path = url.searchParams.get("path") || "";
  const format = (url.searchParams.get("format") || "csv").toLowerCase();
  if (!path) return NextResponse.json({ success: false, error: "path is required" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const run = await getLatestAuditRun(path).catch(() => null);
  if (!run) return NextResponse.json({ success: false, error: "No stored audit for this path" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  if (format === "json") {
    return new NextResponse(JSON.stringify({ run }, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="seo-audit-${path.replace(/[^a-z0-9-]+/gi, "_")}.json"`, "Cache-Control": "no-store" } });
  }
  const header = "url,audited_at,severity,category,title,description,evidence,recommendation,status";
  const rows = run.findings.map((finding) => [run.url, run.auditedAt, finding.severity, finding.category, finding.title, finding.description, finding.evidence, finding.recommendation, finding.status].map(csvEscape).join(","));
  const csv = [header, ...rows].join("\n");
  return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="seo-audit-${path.replace(/[^a-z0-9-]+/gi, "_")}.csv"`, "Cache-Control": "no-store" } });
}
