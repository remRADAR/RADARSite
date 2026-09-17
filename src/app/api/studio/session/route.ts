import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName, isSessionValid } from "@/lib/studio-server";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const authenticated = isSessionValid(request.cookies.get(getSessionCookieName())?.value);
  return NextResponse.json({ authenticated }, { status: authenticated ? 200 : 401, headers: { "Cache-Control": "no-store, max-age=0" } });
}
