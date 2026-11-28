import assert from "node:assert/strict";
import { mergeVerifiedPlatformLinks } from "@/lib/release-links";

const existing = [
  { name: "Spotify", tone: "spotify", href: "https://open.spotify.com/album/old", verification: "source" as const, kind: "stream" as const },
  { name: "Apple Music", tone: "apple", href: "https://music.apple.com/old", verification: "metadata" as const, kind: "stream" as const },
  { name: "YouTube", tone: "youtube", href: "https://www.youtube.com/watch?v=old", verification: "metadata" as const, kind: "stream" as const },
];
const discovered = [
  { name: "Spotify", tone: "spotify", href: "https://open.spotify.com/album/new", verification: "source" as const, kind: "stream" as const },
  { name: "Boomplay", tone: "boomplay", href: "https://www.boomplay.com/album/new", verification: "metadata" as const, kind: "stream" as const },
  { name: "Deezer", tone: "deezer", href: "https://www.deezer.com/album/new", verification: "metadata" as const, kind: "stream" as const },
  { name: "Audiomack", tone: "audiomack", href: "https://audiomack.com/song/unverified", verification: undefined, kind: "presave" as const },
];

const merged = mergeVerifiedPlatformLinks(existing, discovered);
assert.deepEqual(merged.map((item) => item.name), ["Spotify", "Apple Music", "YouTube", "Boomplay", "Deezer"]);
assert.equal(merged.find((item) => item.name === "Spotify")?.href, "https://open.spotify.com/album/new");
assert.equal(merged.find((item) => item.name === "Apple Music")?.href, "https://music.apple.com/old");
assert.equal(merged.some((item) => item.name === "Audiomack"), false);

console.log("release-links late-discovery contract test: all assertions passed");
