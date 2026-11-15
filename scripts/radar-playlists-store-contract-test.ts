import assert from "node:assert/strict";
import {
  RADAR_PLAYLIST_MAX_BYTES,
  RADAR_PLAYLIST_OBJECT_KEY,
  RADAR_PLAYLIST_STORE_VERSION,
  createRadarPlaylistStoreState,
  emptyRadarPlaylistConfig,
  isRadarPlaylistConditionalWriteConflict,
  playlistRevision,
} from "@/lib/spotify/playlist-store";

const playlistId = "37i9dQZF1DXcBWIGoYBM5M";
const state = createRadarPlaylistStoreState({
  playlists: [{ spotifyPlaylistId: playlistId, title: "RADAR Signals", sortOrder: 4, featured: true }],
}, "2026-11-15T00:00:00.000Z");

assert.equal(RADAR_PLAYLIST_OBJECT_KEY, "content/radarsite-playlists-v1.json");
assert.equal(RADAR_PLAYLIST_STORE_VERSION, 1);
assert.equal(state.version, RADAR_PLAYLIST_STORE_VERSION);
assert.equal(state.revision, playlistRevision(state.config));
assert.equal(state.config.playlists[0]?.sortOrder, 0);
assert.equal(state.config.playlists[0]?.featured, true);
assert.equal(createRadarPlaylistStoreState(state.config, state.updatedAt).revision, state.revision);
assert.notEqual(createRadarPlaylistStoreState({ ...state.config, playlists: [] }, state.updatedAt).revision, state.revision);
assert.deepEqual(emptyRadarPlaylistConfig(), { schemaVersion: 1, playlists: [], updatedAt: "1970-01-01T00:00:00.000Z" });
assert.equal(RADAR_PLAYLIST_MAX_BYTES, 512 * 1024);
assert.equal(isRadarPlaylistConditionalWriteConflict({ $metadata: { httpStatusCode: 412 } }), true);
assert.equal(isRadarPlaylistConditionalWriteConflict({ name: "PreconditionFailed" }), true);
assert.equal(isRadarPlaylistConditionalWriteConflict({ name: "AccessDenied" }), false);

console.log("RADARPlaylists Phase 2 store contract passed: versioning, deterministic revisions, normalization, and conditional conflicts.");
