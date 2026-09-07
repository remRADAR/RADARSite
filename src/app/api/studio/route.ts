import { NextRequest, NextResponse } from "next/server";
import { defaultSiteOverrides } from "@/lib/site-overrides";
import { hasContentDatabase, readContent, writeContent } from "@/lib/content-server";
import { createSessionToken, getSessionCookieName, getSessionMaxAge, hasDatabase, isAdminPasswordValid, isSessionValid, readStudioSettings, writeStudioSettings } from "@/lib/studio-server";
import { isSameOriginMutation, rateLimit } from "@/lib/request-security";

export const dynamic = "force-dynamic";
const failedLogins = new Map<string, { count: number; resetAt: number }>();
const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function json(data: unknown, init?: ResponseInit) { const response = NextResponse.json(data, init); response.headers.set("Cache-Control", "no-store, max-age=0"); response.headers.set("X-Content-Type-Options", "nosniff"); return response; }
function limited(request: NextRequest, scope: string, limit = 100) { const result = rateLimit(request, scope, limit); return result.allowed ? null : json({ error: "Too many requests. Try again later." }, { status: 429, headers: { "Retry-After": String(result.retryAfter) } }); }
function mutationGuard(request: NextRequest) { return isSameOriginMutation(request) ? null : json({ error: "Cross-origin mutation rejected" }, { status: 403 }); }
function clearSession(response: NextResponse) { response.cookies.set(getSessionCookieName(), "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 }); }
function clientKey(request: NextRequest) { return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"; }
async function readJson(request: NextRequest) { if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) return null; return request.json().catch(() => null) as Promise<unknown>; }

export async function GET(request: NextRequest) {
  const blocked = limited(request, "studio-read"); if (blocked) return blocked;
  if (!hasDatabase()) return json({ configured: false, contentConfigured: hasContentDatabase(), settings: defaultSiteOverrides, content: await readContent() });
  try { return json({ configured: true, contentConfigured: hasContentDatabase(), settings: await readStudioSettings(), content: await readContent() }); }
  catch { return json({ configured: false, settings: defaultSiteOverrides, error: "Studio persistence is unavailable" }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  const guard = mutationGuard(request); if (guard) return guard;
  const blocked = limited(request, "studio-login", LOGIN_LIMIT); if (blocked) return blocked;
  const key = clientKey(request); const now = Date.now(); const attempt = failedLogins.get(key);
  if (attempt && attempt.resetAt > now && attempt.count >= LOGIN_LIMIT) return json({ error: "Too many login attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(Math.ceil((attempt.resetAt - now) / 1000)) } });
  const body = await readJson(request) as { password?: unknown } | null; const password = typeof body?.password === "string" ? body.password : "";
  if (!isAdminPasswordValid(password)) { const next = attempt && attempt.resetAt > now ? { count: attempt.count + 1, resetAt: attempt.resetAt } : { count: 1, resetAt: now + LOGIN_WINDOW_MS }; failedLogins.set(key, next); return json({ error: "Invalid admin password" }, { status: 401 }); }
  failedLogins.delete(key);
  const response = json({ authenticated: true }); response.cookies.set(getSessionCookieName(), createSessionToken(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: getSessionMaxAge() }); return response;
}

export async function DELETE(request: NextRequest) { const guard = mutationGuard(request); if (guard) return guard; const blocked = limited(request, "studio-logout"); if (blocked) return blocked; const response = json({ authenticated: false }); if (isSessionValid(request.cookies.get(getSessionCookieName())?.value)) clearSession(response); return response; }

export async function PUT(request: NextRequest) {
  const guard = mutationGuard(request); if (guard) return guard;
  const blocked = limited(request, "studio-write"); if (blocked) return blocked;
  const session = request.cookies.get(getSessionCookieName())?.value;
  if (!isSessionValid(session)) { const response = json({ error: "Admin authentication required" }, { status: 401 }); clearSession(response); return response; }
  if (!hasDatabase()) return json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  const body = await readJson(request) as { settings?: unknown; content?: unknown } | null;
  if (!body || (!Object.prototype.hasOwnProperty.call(body, "settings") && !Object.prototype.hasOwnProperty.call(body, "content"))) return json({ error: "Settings or content payload is required" }, { status: 400 });
  try {
    if (Object.prototype.hasOwnProperty.call(body, "content")) return json({ saved: true, content: await writeContent(body.content) });
    return json({ saved: true, settings: await writeStudioSettings(body.settings) });
  }
  catch (error) { const tooLarge = error instanceof Error && error.message === "Studio settings payload is too large"; return json({ error: tooLarge ? error.message : "Unable to save Studio settings" }, { status: tooLarge ? 413 : 500 }); }
}
