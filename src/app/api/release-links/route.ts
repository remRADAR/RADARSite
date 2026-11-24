import { NextRequest, NextResponse } from "next/server";
import { getClientAddress, isSameOriginMutation, rateLimit } from "@/lib/request-security";
import { getSessionCookieName, isSessionValid } from "@/lib/studio-server";
import { getReleaseLink, listReleaseLinks, scrapeReleaseSource, upsertReleaseLink, slugify } from "@/lib/release-links";

export const dynamic = "force-dynamic";
function json(data: unknown, init?: ResponseInit) { const response = NextResponse.json(data, init); response.headers.set("Cache-Control", "no-store, max-age=0"); response.headers.set("X-Content-Type-Options", "nosniff"); return response; }
function session(request: NextRequest) { return isSessionValid(request.cookies.get(getSessionCookieName())?.value); }
function auth(request: NextRequest) { return session(request) ? null : json({ error: "Admin authentication required" }, { status: 401 }); }
function text(value: unknown, max = 500) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
export async function GET(request: NextRequest) { const limited = rateLimit(request, "release-links-read", 60); if (!limited.allowed) return json({ error: "Too many requests" }, { status: 429 }); const denied = auth(request); if (denied) return denied; try { return json({ releases: await listReleaseLinks() }); } catch (error) { return json({ error: error instanceof Error ? error.message : "Unable to load release links" }, { status: 503 }); } }
export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return json({ error: "Cross-origin mutation rejected" }, { status: 403 });
  const limited = rateLimit(request, `release-links-write:${getClientAddress(request)}`, 20); if (!limited.allowed) return json({ error: "Too many requests" }, { status: 429 });
  const denied = auth(request); if (denied) return denied;
  const body = await request.json().catch(() => null) as { action?: unknown; sourceUrl?: unknown; release?: Record<string, unknown> } | null;
  if (!body) return json({ error: "JSON body required" }, { status: 400 });
  try {
    if (body.action === "scrape") { if (!text(body.sourceUrl, 2000)) return json({ error: "Source URL is required" }, { status: 400 }); return json({ release: await scrapeReleaseSource(text(body.sourceUrl, 2000)) }); }
    if (body.action === "save" && body.release) {
      const release = body.release;
      const scraped = await scrapeReleaseSource(text(release.sourceUrl, 2000));
      const overrideSlug = text(release.slug, 160);
      const next = { ...scraped, slug: slugify(overrideSlug || scraped.slug), title: text(release.title, 240) || scraped.title, artist: text(release.artist, 240) || scraped.artist };
      return json({ saved: true, release: await upsertReleaseLink(next) });
    }
    return json({ error: "Use action scrape or save" }, { status: 400 });
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Release-link operation failed" }, { status: 400 }); }
}
export async function HEAD(request: NextRequest) { const slug = text(request.nextUrl.searchParams.get("slug"), 160); return slug ? json({ exists: Boolean(await getReleaseLink(slug)) }) : json({ ok: true }); }
