import { NextResponse } from "next/server";
import { normalizeSiteConfig } from "@/types/site-config";
export async function POST(request: Request) { try { const body = await request.json(); const config = normalizeSiteConfig(body); return NextResponse.json({ success: true, config, timestamp: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } }); } catch { return NextResponse.json({ success: false, error: "Invalid configuration payload" }, { status: 400 }); } }
