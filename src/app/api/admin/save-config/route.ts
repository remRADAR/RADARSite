import { NextRequest, NextResponse } from "next/server";
import { normalizeSiteConfig } from "@/types/site-config";
import { getSessionCookieName, isSessionValid } from "@/lib/studio-server";
import { isSameOriginMutation } from "@/lib/request-security";
export async function POST(request: NextRequest) { if (!isSameOriginMutation(request)) return NextResponse.json({ success: false, error: "Cross-origin mutation rejected" }, { status: 403 }); if (!isSessionValid(request.cookies.get(getSessionCookieName())?.value)) return NextResponse.json({ success: false, error: "Admin authentication required" }, { status: 401, headers: { "Cache-Control": "no-store" } }); try { const body = await request.json(); const config = normalizeSiteConfig(body); return NextResponse.json({ success: true, config, timestamp: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } }); } catch { return NextResponse.json({ success: false, error: "Invalid configuration payload" }, { status: 400 }); } }
