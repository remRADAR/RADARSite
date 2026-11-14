import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { contentCacheTag, hasContentDatabase, normalizeContent, readContent, writeContent } from "@/lib/content-server";
import { getSessionCookieName, isSessionValid } from "@/lib/studio-server";
import { getAllTrackStories, normalizeTrackStory, TrackStoryValidationError } from "@/lib/track-story";
import { isSameOriginMutation, rateLimit } from "@/lib/request-security";

export const dynamic = "force-dynamic";
function json(data: unknown, init?: ResponseInit) { const response = NextResponse.json(data, init); response.headers.set("Cache-Control", "no-store, max-age=0"); return response; }
function authorized(request: NextRequest) { return isSessionValid(request.cookies.get(getSessionCookieName())?.value); }
function text(value: unknown, max = 2000) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

export async function GET(request: NextRequest) {
  if (!authorized(request)) return json({ error: "Admin authentication required" }, { status: 401 });
  const limited = rateLimit(request, "studio-track-read", 100); if (!limited.allowed) return json({ error: "Too many requests" }, { status: 429 });
  const content = await readContent();
  return json({ tracks: getAllTrackStories(content) });
}

export async function PUT(request: NextRequest) {
  if (!isSameOriginMutation(request)) return json({ error: "Cross-origin mutation rejected" }, { status: 403 });
  if (!authorized(request)) return json({ error: "Admin authentication required" }, { status: 401 });
  if (!hasContentDatabase()) return json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  const body = await request.json().catch(() => null) as { track?: unknown } | null;
  if (!body?.track || typeof body.track !== "object") return json({ error: "TrackStory payload is required" }, { status: 400 });
  try {
    const current = await readContent();
    const currentTracks = current.tracks || [];
    const existing = currentTracks.find((item) => item.slug === text((body.track as Record<string, unknown>).slug) || item.id === text((body.track as Record<string, unknown>).id));
    const track = normalizeTrackStory(body.track);
    const duplicate = currentTracks.some((item) => item.slug === track.slug && item.id !== track.id);
    if (duplicate) return json({ error: "Another TrackStory already uses this slug" }, { status: 409 });
    const tracks = existing ? currentTracks.map((item) => item.id === existing.id ? track : item) : [...currentTracks, track];
    await writeContent(normalizeContent({ ...current, tracks }));
    revalidateTag(contentCacheTag(), { expire: 0 });
    return json({ saved: true, track });
  } catch (error) { const errors = error instanceof TrackStoryValidationError ? error.errors : [error instanceof Error ? error.message : "Unable to save TrackStory"]; return json({ error: errors.join(" "), errors }, { status: 400 }); }
}
