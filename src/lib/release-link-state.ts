import type { ReleaseLink, ReleasePlatform } from "@/lib/release-links";

/**
 * Presave / stream state for a release link panel.
 *
 * The distributor (AmpSuite) hands out ONE Spotify link per release. While the
 * song is still a presave that link redirects into Spotify's OAuth presave flow
 * (accounts.spotify.com/authorize -> suitebeats.ampsuite.com/spotify_presave.php).
 * On release day the very same link starts redirecting to the real
 * open.spotify.com album/track page. So the link itself is the source of truth:
 * we probe it and read where it lands, instead of guessing from a date.
 */
export type ReleaseLinkState = "presave" | "live";

export type ResolvedRelease = ReleaseLink & {
  /** "presave" until the Spotify source actually resolves to a stream page. */
  linkState: ReleaseLinkState;
  /** The href the panel should use for the primary Spotify row. */
  primaryHref: string;
};

const PRESAVE_HOSTS = [/^accounts\.spotify\.com$/i, /^suitebeats\.ampsuite\.com$/i, /^www\.suitebeats\.ampsuite\.com$/i];
const STREAM_URL = /^https:\/\/open\.spotify\.com\/(?:intl-[^/]+\/)?(?:album|track)\/([A-Za-z0-9]{22})(?:[?#]|$)/i;
const MAX_HOPS = 6;
const PROBE_TIMEOUT_MS = 6_000;
const CACHE_TTL_MS = 5 * 60_000;

type ProbeResult = { state: ReleaseLinkState; streamHref?: string; finalUrl: string; hops: string[] };

const probeCache = new Map<string, { at: number; result: ProbeResult }>();

/** Classify a URL we have landed on. Returns null when it is neither a known presave nor a stream page. */
export function classifySpotifyDestination(url: string): { state: ReleaseLinkState; streamHref?: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (PRESAVE_HOSTS.some((pattern) => pattern.test(parsed.hostname))) return { state: "presave" };
  const match = url.match(STREAM_URL);
  if (match) return { state: "live", streamHref: `https://open.spotify.com/${url.includes("/track/") ? "track" : "album"}/${match[1]}` };
  return null;
}

/**
 * Follow the distributor link hop by hop and report where it ends up.
 * Manual redirects (rather than redirect:"follow") so a loop is detected and
 * reported instead of surfacing as an opaque fetch failure.
 */
export async function probeSpotifySource(href: string): Promise<ProbeResult> {
  const cached = probeCache.get(href);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.result;

  const hops: string[] = [];
  let current = href;
  let result: ProbeResult = { state: "presave", finalUrl: href, hops };

  try {
    for (let hop = 0; hop < MAX_HOPS; hop += 1) {
      hops.push(current);
      const response = await fetch(current, {
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        headers: { accept: "text/html,application/xhtml+xml", "user-agent": "RADARMusic-LinkState/1.0" },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) break;
        const next = new URL(location, current).toString();
        if (hops.includes(next)) break; // redirect loop — stay on presave
        const classified = classifySpotifyDestination(next);
        if (classified) {
          result = { ...classified, finalUrl: next, hops };
          break;
        }
        current = next;
        continue;
      }

      const classified = classifySpotifyDestination(current);
      result = classified ? { ...classified, finalUrl: current, hops } : { state: "presave", finalUrl: current, hops };
      break;
    }
  } catch {
    // Network failure or timeout: never claim the release is live on a failed probe.
    result = { state: "presave", finalUrl: current, hops };
  }

  probeCache.set(href, { at: Date.now(), result });
  return result;
}

/** Start of the release day in the label's timezone (Africa/Lagos, UTC+1). */
export function releaseDayStart(releaseDate: string): Date {
  const parsed = new Date(`${releaseDate}T00:00:00+01:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function primaryPlatform(platforms: ReleasePlatform[]): ReleasePlatform | undefined {
  return platforms.find((platform) => platform.name.toLowerCase() === "spotify") ?? platforms[0];
}

/**
 * Resolve a release into the state the panel should render.
 *
 * - Before release day: presave, no network probe needed.
 * - On/after release day: probe the Spotify source. Only when it actually
 *   resolves to a stream page do we switch the href and the label. If the
 *   distributor has not flipped the link yet we keep showing the presave link,
 *   so the panel is never empty and never claims a stream that does not exist.
 */
export async function resolveReleaseLinkState(release: ReleaseLink, now: Date = new Date()): Promise<ResolvedRelease> {
  const primary = primaryPlatform(release.platformLinks);
  if (!primary) return { ...release, linkState: "presave", primaryHref: "" };

  const beforeReleaseDay = now.getTime() < releaseDayStart(release.releaseDate).getTime();
  if (beforeReleaseDay) return { ...release, linkState: "presave", primaryHref: primary.href };

  const probe = await probeSpotifySource(primary.href);
  if (probe.state === "live" && probe.streamHref) {
    const platformLinks = release.platformLinks.map((platform) =>
      platform === primary ? { ...platform, href: probe.streamHref as string, kind: "stream" as const } : platform,
    );
    return { ...release, platformLinks, linkState: "live", primaryHref: probe.streamHref };
  }

  const platformLinks = release.platformLinks.map((platform) =>
    platform === primary ? { ...platform, kind: "presave" as const } : platform,
  );
  return { ...release, platformLinks, linkState: "presave", primaryHref: primary.href };
}
