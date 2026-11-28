import { NextRequest, NextResponse } from "next/server";
import { listReleaseLinks } from "@/lib/release-links";
import { resolveReleaseLinkState } from "@/lib/release-link-state";
import { findReleasePendingIssues, summarizePendingIssues } from "@/lib/studio-pending-issues";
import { getSessionCookieName, isSessionValid } from "@/lib/studio-server";

export const dynamic = "force-dynamic";

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function GET(request: NextRequest) {
  if (!isSessionValid(request.cookies.get(getSessionCookieName())?.value)) return json({ error: "Admin authentication required" }, { status: 401 });
  try {
    const releases = await listReleaseLinks();
    const resolved = await Promise.all(releases.filter((release) => release.status === "published").map((release) => resolveReleaseLinkState(release)));
    const issues = findReleasePendingIssues(resolved);
    return json({ checkedAt: new Date().toISOString(), releasesChecked: resolved.length, summary: summarizePendingIssues(issues), issues });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to check Studio pending issues" }, { status: 503 });
  }
}
