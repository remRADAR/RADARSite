import { NextRequest, NextResponse } from "next/server";
import { defaultSiteOverrides, type SiteOverrides } from "@/lib/site-overrides";
import { createSessionToken, getSessionCookieName, hasDatabase, isAdminPasswordValid, isSessionValid, readStudioSettings, writeStudioSettings } from "@/lib/studio-server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDatabase()) return NextResponse.json({ configured: false, settings: defaultSiteOverrides });
  try { return NextResponse.json({ configured: true, settings: await readStudioSettings() }); }
  catch { return NextResponse.json({ configured: false, settings: defaultSiteOverrides }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { password?: string } | null;
  if (!isAdminPasswordValid(body?.password || "")) return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(getSessionCookieName(), createSessionToken(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return response;
}

export async function PUT(request: NextRequest) {
  const session = request.cookies.get(getSessionCookieName())?.value;
  if (!isSessionValid(session)) return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  const body = await request.json().catch(() => null) as { settings?: SiteOverrides } | null;
  if (!body?.settings) return NextResponse.json({ error: "Settings payload is required" }, { status: 400 });
  const settings = { ...defaultSiteOverrides, ...body.settings };
  try { return NextResponse.json({ saved: true, settings: await writeStudioSettings(settings) }); }
  catch { return NextResponse.json({ error: "Unable to save Studio settings" }, { status: 500 }); }
}
