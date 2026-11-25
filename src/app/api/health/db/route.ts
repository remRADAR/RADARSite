import { NextRequest, NextResponse } from "next/server";
import { classifyDatabaseError, databaseProvider, databaseSql, resolveNeonConnection } from "@/lib/database";
import { getSessionCookieName, isSessionValid } from "@/lib/studio-server";

export const dynamic = "force-dynamic";

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

/**
 * Read-only diagnostic for the production write path.
 *
 * It answers the one question the 530/1016 investigation needs: does the Worker's
 * configured DATABASE_URL resolve to a reachable Neon HTTP endpoint, and can a
 * write-capable statement round-trip? It never mutates data (SELECT only) and is
 * gated to an admin session or the release-detector bearer token.
 */
export async function GET(request: NextRequest) {
  const session = isSessionValid(request.cookies.get(getSessionCookieName())?.value);
  const expected = process.env.RADAR_RELEASE_DETECTOR_TOKEN;
  const internal = Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`);
  if (!session && !internal) return json({ error: "Admin authentication required" }, { status: 401 });

  const url = process.env.DATABASE_URL;
  if (!url) return json({ ok: false, stage: "config", error: "DATABASE_URL is not configured" }, { status: 503 });

  const provider = databaseProvider();
  let connection: { host: string; endpoint: string; pooled: boolean; warnings: string[] } | null = null;
  try {
    if (provider === "neon") {
      const resolved = resolveNeonConnection(url);
      connection = { host: resolved.host, endpoint: resolved.endpoint, pooled: resolved.pooled, warnings: resolved.warnings };
    }
  } catch (error) {
    return json({
      ok: false,
      stage: "resolve",
      provider,
      error: error instanceof Error ? error.message : "Connection resolution failed",
    }, { status: 503 });
  }

  const startedAt = Date.now();
  try {
    const rows = await databaseSql()`SELECT 1 AS ok, current_database() AS database, now() AS server_time` as Array<{ ok: number; database: string; server_time: string }>;
    return json({
      ok: true,
      stage: "query",
      provider,
      connection,
      latencyMs: Date.now() - startedAt,
      database: rows[0]?.database,
      serverTime: rows[0]?.server_time,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({
      ok: false,
      stage: "query",
      provider,
      connection,
      latencyMs: Date.now() - startedAt,
      kind: classifyDatabaseError(message),
      error: message,
    }, { status: 503 });
  }
}
