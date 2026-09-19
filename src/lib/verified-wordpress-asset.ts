import { sourceChecksum, type SyntheticWordPressAttachment, type WordPressMediaProvider } from "@/lib/wordpress-media-dry-run";

export type VerifiedWordPressAssetManifest = {
  provider: WordPressMediaProvider;
  site: string;
  postId: string;
  attachmentId: string;
  sourceUrl: string;
  originalFilename: string;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
  sha256: string;
};

/** Metadata from the separately verified single real attachment. The media bytes are intentionally not stored here. */
export const VERIFIED_LEGACY_ASSET: VerifiedWordPressAssetManifest = {
  provider: "legacy",
  site: "remradar.wordpress.com",
  postId: "4754",
  attachmentId: "4757",
  sourceUrl: "https://remradar.wordpress.com/wp-content/uploads/2025/12/img_8211.jpg",
  originalFilename: "img_8211.jpg",
  mimeType: "image/jpeg",
  width: 3810,
  height: 2143,
  byteSize: 3_809_777,
  sha256: "b0d64f521328f53e48322881c3740881bf7ef5db7f804b3d3eeeccbf4f1c8604",
};

export function createAttachmentFromVerifiedManifest(manifest: VerifiedWordPressAssetManifest, sourceBytes: Buffer): SyntheticWordPressAttachment {
  if (sourceBytes.byteLength !== manifest.byteSize) throw new Error(`VERIFIED_ASSET_SIZE_MISMATCH:${manifest.attachmentId}`);
  if (sourceChecksum(sourceBytes) !== manifest.sha256) throw new Error(`VERIFIED_ASSET_CHECKSUM_MISMATCH:${manifest.attachmentId}`);
  return {
    provider: manifest.provider,
    attachmentId: manifest.attachmentId,
    sourceUrl: manifest.sourceUrl,
    originalFilename: manifest.originalFilename,
    mimeType: manifest.mimeType,
    width: manifest.width,
    height: manifest.height,
    sourceBytes,
    wordpressMetadata: { site: manifest.site, postId: manifest.postId, attachmentId: manifest.attachmentId, mediaIdentity: `media:${manifest.provider}:${manifest.attachmentId}` },
  };
}

export function createVerifiedLegacyAttachment(sourceBytes: Buffer) {
  return createAttachmentFromVerifiedManifest(VERIFIED_LEGACY_ASSET, sourceBytes);
}
