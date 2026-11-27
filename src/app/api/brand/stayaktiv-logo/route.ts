import { NextResponse } from "next/server";
import { readStorageObject } from "@/lib/media-storage";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * Serve the stayAKTiV brand mark from our own media bucket.
 *
 * The mark is imported into R2 by the one-time Eze media import route, so the
 * social card can reference it without a committed binary asset in the repo.
 * Cached aggressively: the object key is content-addressed by name and only
 * changes when the mark itself is replaced.
 */
export async function GET() {
  try {
    const object = await readStorageObject("brand/stayaktiv-logo.png");
    return new NextResponse(new Uint8Array(object.body), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "brand mark unavailable" }, { status: 404 });
  }
}
