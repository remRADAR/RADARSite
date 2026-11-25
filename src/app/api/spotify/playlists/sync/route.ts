import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { isSameOriginMutation, rateLimit } from "@/lib/request-security";
import { getSessionCookieName, isSessionValid } from "@/lib/studio-server";
import { parseSpotifyPlaylistReference } from "@/lib/spotify/playlist-validation";
import { syncRadarPlaylists } from "@/lib/spotify/playlist-sync";
import { SpotifySyncError } from "@/lib/spotify/spotify-sync";

const NO_STORE = { "Cache-Control": "no-store" };

function isCronTokenValid(request: NextRequest) {
  const expected = process.env.RADAR_PLAYLIST_SYNC_TOKEN;
  const provided = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!expected || !provided || provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  const cronAuthorized = isCronTokenValid(request);
  if (!cronAuthorized && !isSameOriginMutation(request)) return NextResponse.json({ success: false, error: "Cross-origin mutation rejected" }, { status: 403, headers: NO_STORE });
  if (!cronAuthorized && !isSessionValid(request.cookies.get(getSessionCookieName())?.value)) return NextResponse.json({ success: false, error: "Admin authentication required" }, { status: 401, headers: NO_STORE });
  const limit = rateLimit(request, "radar-playlist-sync", 10);
  if (!limit.allowed) return NextResponse.json({ success: false, error: "Too many synchronisation requests", retryAfter: limit.retryAfter }, { status: 429, headers: { ...NO_STORE, "Retry-After": String(limit.retryAfter) } });

  const body = (await request.json().catch(() => ({}))) as { spotifyPlaylistId?: unknown };
  let spotifyPlaylistId: string | undefined;
  if (typeof body.spotifyPlaylistId === "string" && body.spotifyPlaylistId.trim()) {
    try {
      spotifyPlaylistId = parseSpotifyPlaylistReference(body.spotifyPlaylistId).id;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid Spotify playlist reference." }, { status: 400, headers: NO_STORE });
    }
  }

  try {
    const report = await syncRadarPlaylists({ spotifyPlaylistId });
    const failed = report.outcomes.filter((outcome) => outcome.status === "failed");
    return NextResponse.json({ success: true, ...report, degraded: failed.length > 0 }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof SpotifySyncError) return NextResponse.json({ success: false, error: error.message, kind: error.kind }, { status: error.kind === "credentials" ? 503 : 502, headers: NO_STORE });
    const anyError = error as { name?: string };
    if (anyError.name === "SpotifyCredentialsMissing") return NextResponse.json({ success: false, error: "Spotify client credentials are not configured." }, { status: 503, headers: NO_STORE });
    if (anyError.name === "SpotifyStorageMissing") return NextResponse.json({ success: false, error: "Playlist storage is not configured (Cloudflare R2)." }, { status: 503, headers: NO_STORE });
    return NextResponse.json({ success: false, error: "Synchronisation failed unexpectedly." }, { status: 500, headers: NO_STORE });
  }
}
