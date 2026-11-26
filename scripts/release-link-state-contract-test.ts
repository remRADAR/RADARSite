import assert from "node:assert/strict";
import { classifySpotifyDestination, releaseDayStart, resolveReleaseLinkState } from "@/lib/release-link-state";
import type { ReleaseLink } from "@/lib/release-links";

const PRESAVE_HREF = "https://paradoxrecords.ampsuite.com/releases/link-redirect?release_id=400&store_id=6";

function release(overrides: Partial<ReleaseLink> = {}): ReleaseLink {
  return {
    id: "omolops-400",
    slug: "omolops",
    title: "Omolops",
    artist: "Mamuzo",
    releaseDate: "2026-11-27",
    coverImage: "/releases/omolops-cover.jpeg",
    sourceUrl: "https://paradoxrecords.ampsuite.com/releases/links?id=400",
    sourceTitle: "Omolops - Mamuzo",
    platformLinks: [{ name: "Spotify", tone: "spotify", href: PRESAVE_HREF, verification: "source", kind: "presave" }],
    status: "published",
    updatedAt: "2026-11-24T00:00:00.000Z",
    ...overrides,
  };
}

// --- destination classification -------------------------------------------------
assert.deepEqual(classifySpotifyDestination("https://accounts.spotify.com/authorize?client_id=x"), { state: "presave" });
assert.deepEqual(classifySpotifyDestination("https://suitebeats.ampsuite.com/spotify_presave.php"), { state: "presave" });
assert.deepEqual(classifySpotifyDestination("https://open.spotify.com/album/4Xz4hX4OGQbmDWO8sGzbwW"), {
  state: "live",
  streamHref: "https://open.spotify.com/album/4Xz4hX4OGQbmDWO8sGzbwW",
});
assert.deepEqual(classifySpotifyDestination("https://open.spotify.com/intl-de/track/1111111111111111111111?si=abc"), {
  state: "live",
  streamHref: "https://open.spotify.com/track/1111111111111111111111",
});
assert.equal(classifySpotifyDestination("https://example.com/whatever"), null);

// --- release day boundary -------------------------------------------------------
assert.equal(releaseDayStart("2026-11-27").toISOString(), "2026-11-26T23:00:00.000Z");

// --- rule 1 + 3: before release day the presave link is shown and labelled PRE-SAVE
const beforeRelease = await resolveReleaseLinkState(release(), new Date("2026-11-26T16:25:00Z"));
assert.equal(beforeRelease.linkState, "presave");
assert.equal(beforeRelease.primaryHref, PRESAVE_HREF);
assert.equal(beforeRelease.platformLinks.length, 1, "the presave link must never be filtered out");
assert.equal(beforeRelease.platformLinks[0].kind, "presave");

// The final 24h before release is the case that used to break: a floored day count
// read 0 and the panel went empty. It must still be a presave.
const finalHours = await resolveReleaseLinkState(release(), new Date("2026-11-26T23:30:00Z"));
assert.equal(finalHours.linkState, "presave");
assert.equal(finalHours.platformLinks.length, 1);

// --- rule 4: on release day the Spotify source decides --------------------------
// The distributor has not flipped the link yet -> stay presave, never claim a stream.
const notYetFlipped = await resolveReleaseLinkState(release(), new Date("2026-11-27T09:00:00Z"));
assert.equal(notYetFlipped.linkState, "presave");
assert.equal(notYetFlipped.platformLinks[0].kind, "presave");
assert.equal(notYetFlipped.platformLinks[0].href, PRESAVE_HREF);

// A release with no platform links at all must not throw.
const empty = await resolveReleaseLinkState(release({ platformLinks: [] }), new Date("2026-11-27T09:00:00Z"));
assert.equal(empty.linkState, "presave");
assert.equal(empty.primaryHref, "");

// --- rule 2: the links attachment space carries only the distribution line ------
const { readFileSync } = await import("node:fs");
const panel = readFileSync("src/components/marketing/ReleaseLinkPanel.tsx", "utf8");
assert.match(panel, /Distributed by The RADARMusic/);
assert.doesNotMatch(panel, /RADAR \/ MUSIC \/ RELEASE LINKS/);

// --- rule 3: the label is driven by the resolved state, not a day count ---------
assert.match(panel, /const released = linkState === "live"/);
assert.match(panel, /released \? "STREAM NOW" : "PRE-SAVE"/);
assert.doesNotMatch(panel, /filter\(\(platform\) => platform\.kind === "stream"/);

console.log("release-link-state contract test: all assertions passed");
