import { createHash } from "node:crypto";
import { readStorageObject, putStorageObject } from "@/lib/media-storage";
import { normalizeRadarPlaylistConfig } from "@/lib/spotify/playlist-validation";
import { RADAR_PLAYLIST_SCHEMA_VERSION, type RadarPlaylistConfig } from "@/types/radar-playlists";

export const RADAR_PLAYLIST_OBJECT_KEY = "content/radarsite-playlists-v1.json";
export const RADAR_PLAYLIST_STORE_VERSION = 1;
export const RADAR_PLAYLIST_MAX_BYTES = 512 * 1024;

export type RadarPlaylistStoreState = {
  version: typeof RADAR_PLAYLIST_STORE_VERSION;
  revision: string;
  updatedAt: string;
  config: RadarPlaylistConfig;
};

export type RadarPlaylistStoreSnapshot = {
  state: RadarPlaylistStoreState;
  etag: string;
};

export function radarPlaylistStoreEnabled() {
  return process.env.RADAR_PLAYLIST_STORE === "cloudflare" || process.env.RADAR_CONTENT_STORE === "cloudflare";
}

export function radarPlaylistStoreConfigured() {
  const nativeWorkersBinding = process.env.RADAR_PLAYLIST_STORE === "cloudflare" || process.env.RADAR_CONTENT_STORE === "cloudflare";
  return Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET && (nativeWorkersBinding || (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)));
}

export function emptyRadarPlaylistConfig(updatedAt = new Date(0).toISOString()): RadarPlaylistConfig {
  return { schemaVersion: RADAR_PLAYLIST_SCHEMA_VERSION, playlists: [], updatedAt };
}

export function playlistRevision(config: RadarPlaylistConfig) {
  return createHash("sha256").update(JSON.stringify(config)).digest("hex");
}

export function createRadarPlaylistStoreState(input: unknown, updatedAt = new Date().toISOString()): RadarPlaylistStoreState {
  const config = normalizeRadarPlaylistConfig(input);
  const normalized = { ...config, updatedAt };
  return { version: RADAR_PLAYLIST_STORE_VERSION, revision: playlistRevision(normalized), updatedAt, config: normalized };
}

function encode(state: RadarPlaylistStoreState) {
  const body = Buffer.from(JSON.stringify(state));
  if (body.byteLength > RADAR_PLAYLIST_MAX_BYTES) throw new Error("RADAR playlist payload is too large");
  return body;
}

export async function readRadarPlaylistStore(): Promise<RadarPlaylistStoreSnapshot | null> {
  try {
    const object = await readStorageObject(RADAR_PLAYLIST_OBJECT_KEY);
    const state = JSON.parse(object.body.toString("utf8")) as Partial<RadarPlaylistStoreState>;
    if (state.version !== RADAR_PLAYLIST_STORE_VERSION || typeof state.revision !== "string" || !state.config || typeof state.updatedAt !== "string") throw new Error("Invalid RADAR playlist store state");
    const config = normalizeRadarPlaylistConfig(state.config);
    const normalized = { ...config, updatedAt: state.updatedAt };
    if (state.revision !== playlistRevision(normalized)) throw new Error("RADAR playlist store checksum mismatch");
    return { state: { version: RADAR_PLAYLIST_STORE_VERSION, revision: state.revision, updatedAt: state.updatedAt, config: normalized }, etag: object.etag };
  } catch (error) {
    const value = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (value.name === "NoSuchKey" || value.$metadata?.httpStatusCode === 404) return null;
    throw error;
  }
}

export async function writeRadarPlaylistStoreState(state: RadarPlaylistStoreState, expectedEtag: string | null) {
  const result = await putStorageObject({
    key: RADAR_PLAYLIST_OBJECT_KEY,
    body: encode(state),
    contentType: "application/json; charset=utf-8",
    cacheControl: "no-cache, no-store, max-age=0",
    ...(expectedEtag ? { ifMatch: expectedEtag } : { ifNoneMatch: "*" }),
  });
  return result.etag;
}

export function isRadarPlaylistConditionalWriteConflict(error: unknown) {
  const value = error as { name?: string; Code?: string; code?: string; $metadata?: { httpStatusCode?: number } };
  return value.name === "PreconditionFailed" || value.Code === "PreconditionFailed" || value.code === "PreconditionFailed" || value.$metadata?.httpStatusCode === 412;
}
