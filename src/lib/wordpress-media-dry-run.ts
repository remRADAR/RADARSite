import { createHash } from "node:crypto";
import type { ContentMediaRecord } from "@/lib/content-server";
import type { StoredMedia } from "@/lib/media-storage";

/** Compatibility-preserving provider vocabulary from the existing importer. */
export type WordPressMediaProvider = "radarcharts" | "legacy";

export type SyntheticWordPressAttachment = {
  provider: WordPressMediaProvider;
  attachmentId: string;
  sourceUrl: string;
  originalFilename: string;
  mimeType: string;
  width: number;
  height: number;
  sourceBytes: Buffer;
  wordpressMetadata?: Record<string, unknown>;
};

export type DryRunMediaResult = {
  mediaId: string;
  key: string;
  checksum: string;
  deliveryUrl: string;
  contentMedia: ContentMediaRecord;
  uploaded: boolean;
  reused: boolean;
};

export type DryRunMediaStorage = {
  put(input: { key: string; body: Buffer; contentType: string; metadata?: Record<string, string> }): Promise<StoredMedia>;
  head(key: string): Promise<{ key: string; url: string; contentType: string; size: number; checksum?: string; metadata?: Record<string, string> }>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
};

export type DryRunMediaRepository = {
  findByIdentity(identity: string): Promise<ContentMediaRecord | undefined>;
  upsert(record: ContentMediaRecord): Promise<void>;
  delete(id: string): Promise<void>;
};

export function mediaIdentity(attachment: Pick<SyntheticWordPressAttachment, "provider" | "attachmentId">) {
  return `media:${attachment.provider}:${attachment.attachmentId}`;
}

export function sourceChecksum(sourceBytes: Buffer) {
  return createHash("sha256").update(sourceBytes).digest("hex");
}

export function dryRunObjectKey(input: Pick<SyntheticWordPressAttachment, "provider" | "attachmentId" | "originalFilename"> & { runId: string }) {
  const extension = input.originalFilename.includes(".") ? input.originalFilename.slice(input.originalFilename.lastIndexOf(".") + 1).toLowerCase().replace(/[^a-z0-9]/g, "") || "bin" : "bin";
  return `site-assets/wordpress-dry-run/${input.runId}/${input.provider}/attachments/${encodeURIComponent(input.attachmentId)}/original.${extension}`;
}

function mediaRecordId(identity: string, runId: string) {
  return `dry-run:${runId}:${identity}`;
}

function assertAttachment(attachment: SyntheticWordPressAttachment) {
  if (!attachment.provider || !attachment.attachmentId || !attachment.sourceUrl || !attachment.originalFilename || !attachment.mimeType || !attachment.sourceBytes.length) throw new Error("Synthetic attachment is incomplete");
  if (!Number.isInteger(attachment.width) || !Number.isInteger(attachment.height) || attachment.width <= 0 || attachment.height <= 0) throw new Error("Synthetic attachment dimensions are invalid");
  if (!/^https:\/\//.test(attachment.sourceUrl)) throw new Error("Synthetic attachment source URL must use HTTPS");
}

export async function migrateSyntheticAttachment(input: {
  attachment: SyntheticWordPressAttachment;
  runId: string;
  storage: DryRunMediaStorage;
  repository: DryRunMediaRepository;
  failAfterUpload?: boolean;
  failDuringPersistence?: boolean;
}): Promise<DryRunMediaResult> {
  assertAttachment(input.attachment);
  const attachment = input.attachment;
  const identity = mediaIdentity(attachment);
  const checksum = sourceChecksum(attachment.sourceBytes);
  const key = dryRunObjectKey({ ...attachment, runId: input.runId });
  const existing = await input.repository.findByIdentity(identity);
  if (existing) {
    if (existing.checksum !== checksum) throw new Error(`MEDIA_CHECKSUM_CONFLICT:${identity}`);
    const head = await input.storage.head(existing.storageKey);
    if (head.size !== attachment.sourceBytes.byteLength || head.contentType !== attachment.mimeType) throw new Error(`MEDIA_METADATA_CONFLICT:${identity}`);
    return { mediaId: existing.id, key: existing.storageKey, checksum, deliveryUrl: existing.deliveryUrl || head.url, contentMedia: existing, uploaded: false, reused: true };
  }

  const uploaded = await input.storage.put({ key, body: attachment.sourceBytes, contentType: attachment.mimeType, metadata: { source_provider: attachment.provider, source_id: attachment.attachmentId, source_checksum: checksum, dry_run: "true" } });
  let persisted = false;
  try {
    if (input.failAfterUpload) throw new Error("FORCED_FAILURE_AFTER_UPLOAD");
    const head = await input.storage.head(key);
    if (head.size !== attachment.sourceBytes.byteLength || head.contentType !== attachment.mimeType) throw new Error("MEDIA_UPLOAD_VERIFICATION_FAILED");
    if (!Buffer.from(await input.storage.get(key)).equals(attachment.sourceBytes)) throw new Error("MEDIA_BYTE_VERIFICATION_FAILED");
    if (input.failDuringPersistence) throw new Error("FORCED_FAILURE_DURING_PERSISTENCE");
    const record: ContentMediaRecord = {
      id: mediaRecordId(identity, input.runId),
      sourceProvider: attachment.provider,
      sourceId: attachment.attachmentId,
      sourceUrl: attachment.sourceUrl,
      originalFilename: attachment.originalFilename,
      mimeType: attachment.mimeType,
      fileSize: attachment.sourceBytes.byteLength,
      width: attachment.width,
      height: attachment.height,
      storageProvider: uploaded.provider,
      storageBucket: uploaded.bucket,
      storageKey: uploaded.key,
      deliveryUrl: uploaded.url,
      checksum,
      migrationStatus: "migrated",
      provenance: { dryRun: true, mediaIdentity: identity, wordpress: attachment.wordpressMetadata || {} },
    };
    await input.repository.upsert(record);
    persisted = true;
    return { mediaId: record.id, key, checksum, deliveryUrl: uploaded.url, contentMedia: record, uploaded: true, reused: false };
  } catch (error) {
    if (persisted) await input.repository.delete(mediaRecordId(identity, input.runId));
    try { await input.storage.delete(key); } catch { /* cleanup is reported by the caller */ }
    throw error;
  }
}

export async function cleanupSyntheticAttachment(input: { result: DryRunMediaResult; storage: DryRunMediaStorage; repository: DryRunMediaRepository }) {
  await input.repository.delete(input.result.mediaId);
  await input.storage.delete(input.result.key);
}
