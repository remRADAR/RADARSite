import { createHash } from "node:crypto";
import { readStorageObject, putStorageObject } from "@/lib/media-storage";

export const CLOUDFLARE_CONTENT_OBJECT_KEY = "content/radarsite-content-v1.json";
export const CLOUDFLARE_CONTENT_STORE_VERSION = 1;

export type CloudflareContentState = {
  version: number;
  revision: string;
  updatedAt: string;
  content: unknown;
  relationships: unknown[];
};

export type CloudflareContentSnapshot = { state: CloudflareContentState; etag: string };

export function cloudflareContentStoreEnabled() {
  return process.env.RADAR_CONTENT_STORE === "cloudflare" || process.env.RADAR_NOTION_DIRECT_READ_ENABLED === "true";
}

export function cloudflareContentStoreConfigured() {
  return Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
}

export function contentRevision(content: unknown, relationships: unknown[] = []) {
  return createHash("sha256").update(JSON.stringify({ content, relationships })).digest("hex");
}

export function createCloudflareContentState(content: unknown, relationships: unknown[] = [], updatedAt = new Date().toISOString()): CloudflareContentState {
  return { version: CLOUDFLARE_CONTENT_STORE_VERSION, revision: contentRevision(content, relationships), updatedAt, content, relationships };
}

function encode(state: CloudflareContentState) { return Buffer.from(JSON.stringify(state)); }

export async function readCloudflareContentState(): Promise<CloudflareContentSnapshot | null> {
  try {
    const object = await readStorageObject(CLOUDFLARE_CONTENT_OBJECT_KEY);
    const state = JSON.parse(object.body.toString("utf8")) as CloudflareContentState;
    if (!state || state.version !== CLOUDFLARE_CONTENT_STORE_VERSION || typeof state.revision !== "string" || !state.content || !Array.isArray(state.relationships)) throw new Error("Invalid Cloudflare content state");
    if (state.revision !== contentRevision(state.content, state.relationships)) throw new Error("Cloudflare content state checksum mismatch");
    return { state, etag: object.etag };
  } catch (error) {
    const value = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (value.name === "NoSuchKey" || value.$metadata?.httpStatusCode === 404) return null;
    throw error;
  }
}

export async function writeCloudflareContentState(state: CloudflareContentState, expectedEtag: string | null) {
  const result = await putStorageObject({
    key: CLOUDFLARE_CONTENT_OBJECT_KEY,
    body: encode(state),
    contentType: "application/json; charset=utf-8",
    cacheControl: "no-cache, no-store, max-age=0",
    ...(expectedEtag ? { ifMatch: expectedEtag } : { ifNoneMatch: "*" }),
  });
  return result.etag;
}

export function isCloudflareConditionalWriteConflict(error: unknown) {
  const value = error as { name?: string; Code?: string; code?: string; $metadata?: { httpStatusCode?: number } };
  return value.name === "PreconditionFailed" || value.Code === "PreconditionFailed" || value.code === "PreconditionFailed" || value.$metadata?.httpStatusCode === 412;
}
