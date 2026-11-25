import assert from "node:assert/strict";
import { bootstrapRadarPlaylistConfig, type SpotifySyncOutcome } from "@/lib/spotify/playlist-sync";
import { mapSpotifyPlaylistItems, mapSpotifyPlaylistSnapshot, mapSpotifyTrack, spotifySyncFailureMessage, SpotifySyncError } from "@/lib/spotify/spotify-sync";
import { toPublicRadarPlaylistConfig } from "@/lib/spotify/playlist-validation";

// The three official RADARCharts playlists seed the dashboard selectors.
const bootstrapped = bootstrapRadarPlaylistConfig("2026-11-25T00:00:00.000Z");
assert.equal(bootstrapped.playlists.length, 3);
assert.deepEqual(
  bootstrapped.playlists.map((playlist) => [playlist.title, playlist.spotifyPlaylistId]),
  [
    ["TOP 10 RADAR", "2JQ5ULxBNkpEvGZLyxC9OC"],
    ["TOP 100 ABUJA", "3QLLaIStWTq6I5ulyvc0FW"],
    ["THE GREAT WALL ABUJA", "6glXNqgtoTT73dKQuE7YbU"],
  ],
);
assert.equal(bootstrapped.playlists.every((playlist) => playlist.tracks.length === 0), true);
assert.equal(bootstrapped.playlists.every((playlist) => playlist.metadataStatus === "pending"), true);
assert.equal(bootstrapped.playlists.find((playlist) => playlist.featured)?.id, "top-100-abuja");
assert.equal(bootstrapped.playlists[0]?.spotifyUrl, "https://open.spotify.com/playlist/2JQ5ULxBNkpEvGZLyxC9OC");

// Spotify Web API payload -> normalized tracks: order preserved, unavailable
// entries skipped, episodes and local files excluded.
const apiItems = {
  items: [
    {
      track: {
        id: "t2",
        uri: "spotify:track:t2",
        name: "Second",
        duration_ms: 201_000,
        type: "track",
        is_local: false,
        artists: [{ name: "Alpha" }, { name: "Beta" }],
        album: { name: "The Album", images: [{ url: "https://i.scdn.co/image/large", width: 640 }, { url: "https://i.scdn.co/image/small", width: 300 }] },
        external_urls: { spotify: "https://open.spotify.com/track/t2?si=x" },
      },
    },
    { track: null },
    { track: { id: "e1", uri: "spotify:episode:e1", name: "Episode", type: "episode", external_urls: { spotify: "https://open.spotify.com/episode/e1" } } },
    { track: { id: "t1", uri: "spotify:track:t1", name: "First", artists: [{ name: "Solo" }], external_urls: { spotify: "https://open.spotify.com/track/t1" } } },
    { track: { id: "lp", uri: "spotify:local:lp", name: "Local file", is_local: true, external_urls: { spotify: "https://open.spotify.com/track/lp" } } },
    "not-an-object",
  ],
};
const tracks = mapSpotifyPlaylistItems(apiItems);
assert.equal(tracks.length, 2);
assert.equal(tracks[0]?.name, "Second");
assert.equal(tracks[1]?.name, "First");
assert.equal(tracks[0]?.spotifyUrl, "https://open.spotify.com/track/t2");
assert.equal(tracks[0]?.albumImageUrl, "https://i.scdn.co/image/large");
assert.deepEqual(tracks[0]?.artists, ["Alpha", "Beta"]);
assert.equal(tracks[1]?.albumName, undefined);

assert.equal(mapSpotifyPlaylistItems({ items: [] }).length, 0);
assert.equal(mapSpotifyPlaylistItems(null).length, 0);
assert.equal(mapSpotifyTrack(undefined), null);

// Playlist metadata mapping: title, description, artwork, owner, order.
const snapshot = mapSpotifyPlaylistSnapshot("2JQ5ULxBNkpEvGZLyxC9OC", {
  name: "TOP 10 RADAR",
  description: "Ten records. ",
  images: [{ url: "https://mosaic.scdn.co/640", width: 640 }],
  owner: { display_name: "remRADAR" },
  external_urls: { spotify: "https://open.spotify.com/playlist/2JQ5ULxBNkpEvGZLyxC9OC" },
}, [apiItems]);
assert.equal(snapshot.title, "TOP 10 RADAR");
assert.equal(snapshot.description, "Ten records.");
assert.equal(snapshot.artworkUrl, "https://mosaic.scdn.co/640");
assert.equal(snapshot.ownerName, "remRADAR");
assert.equal(snapshot.tracks.length, 2);
// Non-Spotify CDN artwork is rejected rather than trusted.
assert.equal(mapSpotifyPlaylistSnapshot("x", { images: [{ url: "https://evil.example/cover.png", width: 640 }] }, []).artworkUrl, undefined);

// Failure classification keeps its kind and message.
assert.equal(spotifySyncFailureMessage(new SpotifySyncError("forbidden", "denied")), "denied");
assert.equal(spotifySyncFailureMessage(new Error("boom")), "boom");
assert.equal(spotifySyncFailureMessage("weird"), "Synchronisation failed.");

// Public projection hides diagnostics; no ranking fields are introduced.
const config = bootstrapRadarPlaylistConfig("2026-11-25T00:00:00.000Z");
const publicPlaylist = toPublicRadarPlaylistConfig(config).playlists[0];
assert.ok(publicPlaylist);
for (const key of ["lastError", "popularity", "movement", "change", "streams", "isNew"]) {
  assert.equal(key in publicPlaylist, false, `unexpected public field: ${key}`);
}
const outcome: SpotifySyncOutcome = { playlistId: "top-10-radar", spotifyPlaylistId: "2JQ5ULxBNkpEvGZLyxC9OC", status: "synced", trackCount: 10, syncedAt: "2026-11-25T00:00:00.000Z" };
assert.equal(outcome.status, "synced");

console.log("RADARCharts Spotify sync contract passed: official playlist seeds, order-preserving payload mapping, safety filters, and failure classification.");
