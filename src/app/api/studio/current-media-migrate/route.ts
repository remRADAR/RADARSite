import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName, isSessionValid } from "@/lib/studio-server";
import { currentMediaMigrationInfo, migrateCurrentMediaBatch } from "@/lib/current-media-migration";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export async function GET(request: NextRequest) {
  if (!isSessionValid(request.cookies.get(getSessionCookieName())?.value)) return json({ error: "Admin authentication required" }, { status: 401 });
  return json({ ok: true, migration: currentMediaMigrationInfo() });
}

export async function POST(request: NextRequest) {
  if (!isSessionValid(request.cookies.get(getSessionCookieName())?.value)) return json({ error: "Admin authentication required" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as {
    mode?: "dry-run" | "upload" | "rewrite";
    offset?: number;
    limit?: number;
    runId?: string;
    confirmation?: string;
  };
  try {
    const mode = body.mode || "dry-run";
    if (!["dry-run", "upload", "rewrite"].includes(mode)) return json({ error: "mode must be dry-run, upload, or rewrite" }, { status: 400 });
    return json(await migrateCurrentMediaBatch({ mode, offset: body.offset, limit: body.limit, runId: body.runId || `current-media-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}`, confirmation: body.confirmation }));
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Current media migration failed", migration: currentMediaMigrationInfo() }, { status: 502 });
  }
}
