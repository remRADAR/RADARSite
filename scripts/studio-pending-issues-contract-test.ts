import assert from "node:assert/strict";
import { findReleasePendingIssues } from "@/lib/studio-pending-issues";
import type { ReleaseLink } from "@/lib/release-links";

const presave: ReleaseLink = {
  id: "omolops-400",
  slug: "omolops",
  title: "Omolops",
  artist: "Mamuzo",
  releaseDate: "2026-11-27",
  coverImage: "/releases/omolops-cover-1080.webp",
  sourceUrl: "https://paradoxrecords.ampsuite.com/releases/links?id=400",
  sourceTitle: "Omolops - Mamuzo",
  platformLinks: [{ name: "Spotify", tone: "spotify", href: "https://paradoxrecords.ampsuite.com/releases/link-redirect?release_id=400&store_id=6", verification: "source", kind: "presave" }],
  status: "published",
  updatedAt: "2026-11-24T00:00:00.000Z",
};

const issues = findReleasePendingIssues([{ ...presave, linkState: "presave", primaryHref: presave.platformLinks[0].href }], new Date("2026-11-28T12:00:00Z"));
assert.equal(issues.some((issue) => issue.code === "release-past-date-presave"), true);
assert.equal(issues.find((issue) => issue.code === "release-past-date-presave")?.severity, "critical");

const live = { ...presave, platformLinks: [{ name: "Spotify", tone: "spotify", href: "https://open.spotify.com/album/4Xz4hX4OGQbmDWO8sGzbwW", verification: "source" as const, kind: "stream" as const }] };
const liveIssues = findReleasePendingIssues([{ ...live, linkState: "live", primaryHref: live.platformLinks[0].href }], new Date("2026-11-28T12:00:00Z"));
assert.equal(liveIssues.some((issue) => issue.code === "release-past-date-presave"), false);
assert.equal(liveIssues.some((issue) => issue.code === "release-missing-verified-platforms"), true);

console.log("studio-pending-issues contract test: all assertions passed");
