import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName, isSessionValid } from "@/lib/studio-server";
import { isSameOriginMutation } from "@/lib/request-security";
import { hasAuditDatabase, updateFindingStatus } from "@/lib/seo-audit/storage";

/**
 * POST /api/admin/seo-audit/resolve
 * Request:  { "runId": string, "findingId": string, "status": "open" | "resolved" | "wont-fix" }
 * Response: { "success": true } | 400/401/404
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ success: false, error: "Cross-origin mutation rejected" }, { status: 403 });
  if (!isSessionValid(request.cookies.get(getSessionCookieName())?.value)) return NextResponse.json({ success: false, error: "Admin authentication required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  if (!hasAuditDatabase()) return NextResponse.json({ success: false, error: "Audit history persistence requires DATABASE_URL" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const body = await request.json().catch(() => null) as { runId?: unknown; findingId?: unknown; status?: unknown } | null;
  const runId = typeof body?.runId === "string" ? body.runId : "";
  const findingId = typeof body?.findingId === "string" ? body.findingId : "";
  const status = typeof body?.status === "string" ? body.status : "";
  if (!runId || !findingId || (status !== "open" && status !== "resolved" && status !== "wont-fix")) {
    return NextResponse.json({ success: false, error: "runId, findingId and a valid status are required" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const updated = await updateFindingStatus(runId, findingId, status).catch(() => false);
  if (!updated) return NextResponse.json({ success: false, error: "Run or finding not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
