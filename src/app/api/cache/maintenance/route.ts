import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { contentCacheTag } from "@/lib/content-server";

export const dynamic = "force-dynamic";

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

function tokenMatches(request: NextRequest) {
  const expected = process.env.CACHE_MAINTENANCE_TOKEN || "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!expected || !supplied) return false;
  const expectedHash = createHash("sha256").update(expected).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

export async function POST(request: NextRequest) {
  if (!tokenMatches(request)) return json({ error: "Maintenance authorization required" }, { status: 401 });
  const now = new Date().toISOString();
  revalidateTag(contentCacheTag(), { expire: 0 });
  revalidatePath("/", "layout");
  return json({ ok: true, maintainedAt: now, invalidated: { tag: contentCacheTag(), layout: true }, destructiveCleanup: false });
}

export async function GET() {
  return json({ ok: true, service: "cache-maintenance", destructiveCleanup: false });
}
