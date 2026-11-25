import { NextRequest, NextResponse } from "next/server";
import { isSameOriginMutation, rateLimit } from "@/lib/request-security";
import { getSessionCookieName, isSessionValid } from "@/lib/studio-server";
import { toPublicRadarPlaylistConfig } from "@/lib/spotify/playlist-validation";
import {
  createRadarPlaylistStoreState,
  emptyRadarPlaylistConfig,
  isRadarPlaylistConditionalWriteConflict,
  radarPlaylistStoreConfigured,
  readRadarPlaylistStore,
  writeRadarPlaylistStoreState,
} from "@/lib/spotify/playlist-store";
import { bootstrapRadarPlaylistConfig } from "@/lib/spotify/playlist-sync";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const adminRead = new URL(request.url).searchParams.get("admin") === "1";
  if (adminRead && !isSessionValid(request.cookies.get(getSessionCookieName())?.value)) return NextResponse.json({ error: "Admin authentication required" }, { status: 401, headers: NO_STORE });
  if (!radarPlaylistStoreConfigured()) {
    const config = adminRead ? emptyRadarPlaylistConfig() : bootstrapRadarPlaylistConfig();
    return NextResponse.json({ config: adminRead ? config : toPublicRadarPlaylistConfig(config), ...(adminRead ? { etag: null } : {}) }, { headers: NO_STORE });
  }
  try {
    const snapshot = await readRadarPlaylistStore();
    const config = snapshot?.state.config && snapshot.state.config.playlists.length > 0 ? snapshot.state.config : adminRead ? emptyRadarPlaylistConfig() : bootstrapRadarPlaylistConfig();
    return NextResponse.json({ config: adminRead ? config : toPublicRadarPlaylistConfig(config), updatedAt: config.updatedAt, ...(adminRead ? { etag: snapshot?.etag || null } : {}) }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "RADARPlaylists are temporarily unavailable." }, { status: 503, headers: NO_STORE });
  }
}

export async function PUT(request: NextRequest) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ success: false, error: "Cross-origin mutation rejected" }, { status: 403, headers: NO_STORE });
  if (!isSessionValid(request.cookies.get(getSessionCookieName())?.value)) return NextResponse.json({ success: false, error: "Admin authentication required" }, { status: 401, headers: NO_STORE });
  const limit = rateLimit(request, "radar-playlist-write", 30);
  if (!limit.allowed) return NextResponse.json({ success: false, error: "Too many playlist updates", retryAfter: limit.retryAfter }, { status: 429, headers: { ...NO_STORE, "Retry-After": String(limit.retryAfter) } });
  if (!radarPlaylistStoreConfigured()) return NextResponse.json({ success: false, error: "Cloudflare playlist storage is not configured" }, { status: 503, headers: NO_STORE });
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 512 * 1024) return NextResponse.json({ success: false, error: "Playlist payload is too large" }, { status: 413, headers: NO_STORE });
  try {
    const body = await request.json() as { config?: unknown; expectedEtag?: unknown };
    const expectedEtag = typeof body.expectedEtag === "string" && body.expectedEtag ? body.expectedEtag : null;
    const state = createRadarPlaylistStoreState(body.config, new Date().toISOString());
    const etag = await writeRadarPlaylistStoreState(state, expectedEtag);
    return NextResponse.json({ success: true, etag, config: state.config }, { headers: NO_STORE });
  } catch (error) {
    if (isRadarPlaylistConditionalWriteConflict(error)) return NextResponse.json({ success: false, error: "Playlist data changed elsewhere; reload before saving." }, { status: 409, headers: NO_STORE });
    if (error instanceof SyntaxError || (error instanceof Error && /payload|playlist|invalid/i.test(error.message))) return NextResponse.json({ success: false, error: "Invalid playlist configuration payload" }, { status: 400, headers: NO_STORE });
    return NextResponse.json({ success: false, error: "Playlist storage is temporarily unavailable" }, { status: 503, headers: NO_STORE });
  }
}
