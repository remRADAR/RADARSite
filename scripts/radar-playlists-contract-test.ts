import assert from "node:assert/strict";
import { parseSpotifyPlaylistReference, normalizeRadarPlaylistConfig, toPublicRadarPlaylistConfig } from "@/lib/spotify/playlist-validation";

const playlistId = "37i9dQZF1DXcBWIGoYBM5M";
assert.deepEqual(parseSpotifyPlaylistReference(playlistId), { id: playlistId, url: `https://open.spotify.com/playlist/${playlistId}` });
assert.deepEqual(parseSpotifyPlaylistReference(`spotify:playlist:${playlistId}`), { id: playlistId, url: `https://open.spotify.com/playlist/${playlistId}` });
assert.deepEqual(parseSpotifyPlaylistReference(`https://open.spotify.com/playlist/${playlistId}?si=private`), { id: playlistId, url: `https://open.spotify.com/playlist/${playlistId}` });
assert.throws(() => parseSpotifyPlaylistReference("https://example.com/playlist/not-spotify"));

const config = normalizeRadarPlaylistConfig({
  featuredPlaylistId: "first",
  updatedAt: "2026-11-15T00:00:00.000Z",
  playlists: [
    {
      id: "second",
      spotifyPlaylistId: playlistId,
      title: " Second  playlist ",
      spotifyUrl: "https://open.spotify.com/playlist/ignored",
      visible: true,
      sortOrder: 2,
      featured: true,
      tracks: [{ id: "track-1", uri: "spotify:track:abc123", name: "Signal", artists: ["RADAR"], spotifyUrl: "https://open.spotify.com/track/abc123", albumImageUrl: "https://i.scdn.co/image/abc" }],
      lastError: "do not publish",
    },
    {
      id: "first",
      spotifyPlaylistId: playlistId,
      title: "First playlist",
      visible: false,
      sortOrder: 1,
      featured: true,
      tracks: [],
    },
  ],
});
assert.equal(config.playlists[0]?.id, "first");
assert.equal(config.playlists.filter((item) => item.featured).length, 1);
assert.equal(config.playlists.find((item) => item.featured)?.id, "first");
const publicConfig = toPublicRadarPlaylistConfig(config);
assert.equal(publicConfig.playlists.length, 1);
assert.equal(publicConfig.playlists[0]?.id, "second");
assert.equal("lastError" in (publicConfig.playlists[0] || {}), false);
assert.equal(publicConfig.playlists[0]?.tracks[0]?.albumImageUrl, "https://i.scdn.co/image/abc");
console.log("RADARPlaylists Phase 1 contract passed: references, normalization, featured state, visibility, and public projection.");
