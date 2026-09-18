import { NextRequest, NextResponse } from "next/server";
import { importWordPressArchive, type SourceProvider } from "@/lib/editorial-migration";
import { getSessionCookieName, isSessionValid } from "@/lib/studio-server";

export const dynamic = "force-dynamic";
function json(data: unknown, init?: ResponseInit) { const response = NextResponse.json(data, init); response.headers.set("Cache-Control", "no-store, max-age=0"); return response; }
export async function POST(request: NextRequest) {
  if (!isSessionValid(request.cookies.get(getSessionCookieName())?.value)) return json({ error: "Admin authentication required" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { dryRun?: boolean; updateExisting?: boolean; sourceProvider?: SourceProvider };
  try { return json(await importWordPressArchive({ dryRun: body.dryRun !== false, updateExisting: body.updateExisting !== false, sourceProvider: body.sourceProvider })); }
  catch (error) { return json({ error: error instanceof Error ? error.message : "Migration failed" }, { status: 502 }); }
}
