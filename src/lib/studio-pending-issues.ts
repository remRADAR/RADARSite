import type { ReleaseLink } from "@/lib/release-links";
import { releaseDayStart, type ResolvedRelease } from "@/lib/release-link-state";

export type PendingIssueSeverity = "critical" | "warning" | "info";
export type PendingIssueCode =
  | "release-past-date-presave"
  | "release-missing-verified-platforms"
  | "release-source-missing"
  | "release-invalid-platform-link";

export type PendingIssue = {
  code: PendingIssueCode;
  severity: PendingIssueSeverity;
  title: string;
  entityId: string;
  entityLabel: string;
  evidence: string;
  suggestedAction: string;
};

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function verifiedStreamingPlatforms(release: ReleaseLink | ResolvedRelease) {
  return release.platformLinks.filter((platform) => platform.kind === "stream" && platform.verification && isHttpUrl(platform.href));
}

function issueBase(release: ReleaseLink, code: PendingIssueCode, severity: PendingIssueSeverity, title: string, evidence: string, suggestedAction: string): PendingIssue {
  return { code, severity, title, entityId: release.id, entityLabel: `${release.artist} — ${release.title}`, evidence, suggestedAction };
}

/**
 * Evaluate release records after the resolver has probed their primary source.
 * This stays pure so the same rules can power the API, the Studio panel, and
 * contract tests without coupling the UI to fetch or database behavior.
 */
export function findReleasePendingIssues(releases: Array<ReleaseLink | ResolvedRelease>, now = new Date()): PendingIssue[] {
  const issues: PendingIssue[] = [];
  for (const release of releases) {
    const resolved = release as ResolvedRelease;
    const afterReleaseDay = now.getTime() >= releaseDayStart(release.releaseDate).getTime();
    const primary = release.platformLinks.find((platform) => platform.name.toLowerCase() === "spotify") ?? release.platformLinks[0];
    const isPresave = resolved.linkState === "presave" || primary?.kind === "presave";

    if (!release.sourceUrl || !isHttpUrl(release.sourceUrl)) {
      issues.push(issueBase(release, "release-source-missing", "critical", "Release source is missing or invalid", "The release has no usable public distributor/source URL.", "Add a public AmpSuite or platform source URL, then run the detector."));
    }

    const invalid = release.platformLinks.filter((platform) => !isHttpUrl(platform.href));
    if (invalid.length) {
      issues.push(issueBase(release, "release-invalid-platform-link", "warning", "Release contains an invalid platform link", `${invalid.length} platform link${invalid.length === 1 ? " is" : "s are"} not valid HTTP(S) URLs.`, "Remove the broken row or replace it with a verified destination."));
    }

    if (afterReleaseDay && isPresave) {
      issues.push(issueBase(release, "release-past-date-presave", "critical", "Release is past its release date but still a presave", `Release date is ${release.releaseDate}; the primary link still resolves to a presave or has not been verified as a live stream.`, "Run the release detector and verify the distributor has flipped the source to a live Spotify/streaming destination. Keep PRE-SAVE visible until it does."));
    }

    const streams = verifiedStreamingPlatforms(release);
    const nonSpotifyStreams = streams.filter((platform) => platform.name.toLowerCase() !== "spotify");
    if (afterReleaseDay && !isPresave && nonSpotifyStreams.length === 0) {
      issues.push(issueBase(release, "release-missing-verified-platforms", "warning", "Live release has no verified non-Spotify platform link", "The source is live, but no verified Apple Music, Deezer, YouTube, Boomplay, Audiomack, Tidal, SoundCloud, or iHeartRadio destination is attached.", "Run cross-platform discovery and save only destinations whose metadata matches this artist and release."));
    }
  }
  return issues;
}

export function summarizePendingIssues(issues: PendingIssue[]) {
  return {
    total: issues.length,
    critical: issues.filter((issue) => issue.severity === "critical").length,
    warning: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}
