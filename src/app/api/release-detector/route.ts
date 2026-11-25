import { NextRequest, NextResponse } from "next/server";
import { getClientAddress, isSameOriginMutation, rateLimit } from "@/lib/request-security";
import { getSessionCookieName, isSessionValid } from "@/lib/studio-server";
import { listArtistProfiles, upsertArtistProfile } from "@/lib/release-links";
import { runReleaseDetector } from "@/lib/release-detector";

export const dynamic = "force-dynamic";
function json(data: unknown, init?: ResponseInit) { const response = NextResponse.json(data, init); response.headers.set("Cache-Control", "no-store, max-age=0"); return response; }
function admin(request: NextRequest) { return isSessionValid(request.cookies.get(getSessionCookieName())?.value); }
function internal(request: NextRequest) { const expected = process.env.RADAR_RELEASE_DETECTOR_TOKEN; return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`); }
function value(input: unknown, max = 1000) { return typeof input === "string" ? input.trim().slice(0, max) : ""; }
export async function GET(request: NextRequest) { if (!admin(request)) return json({ error: "Admin authentication required" }, { status: 401 }); try { return json({ profiles: await listArtistProfiles() }); } catch (error) { return json({ error: error instanceof Error ? error.message : "Unable to load artist profiles" }, { status: 503 }); } }
export async function POST(request: NextRequest) {
  const isInternal = internal(request);
  if (!isInternal && (!isSameOriginMutation(request) || !admin(request))) return json({ error: "Admin authentication required" }, { status: 401 });
  const limited = rateLimit(request, isInternal ? "release-detector-cron" : `release-detector-admin:${getClientAddress(request)}`, 10); if (!limited.allowed) return json({ error: "Too many detector runs" }, { status: 429 });
  const body = await request.json().catch(() => null) as { action?: unknown; profile?: Record<string, unknown> } | null;
  try {
    if (body?.action === "run") return json({ result: await runReleaseDetector() });
    if (body?.action === "profile" && body.profile) {
      const profile = body.profile;
      const artistName = value(profile.artistName, 200); const profileUrl = value(profile.profileUrl, 2000); const monitorUrl = value(profile.monitorUrl, 2000) || profileUrl; const platform = value(profile.platform, 80).toLowerCase();
      if (!artistName || !profileUrl || !monitorUrl || !platform) return json({ error: "Artist name, platform, and profile URL are required" }, { status: 400 });
      return json({ profile: await upsertArtistProfile({ id: value(profile.id, 160) || `artist-profile-${Date.now()}`, artistKey: value(profile.artistKey, 160) || artistName, artistName, platform, profileUrl, profileId: value(profile.profileId, 300), monitorUrl, status: "active", lastSeenSignature: "" }) });
    }
    return json({ error: "Use action profile or run" }, { status: 400 });
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Detector operation failed" }, { status: 400 }); }
}
