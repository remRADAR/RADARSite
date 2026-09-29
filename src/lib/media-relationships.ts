import { createHash } from "node:crypto";

export type MediaPlacementRole = "featured" | "inline";

export type ContentMediaRelationship = {
  id: string;
  mediaId: string;
  contentKey: string;
  contentSourceProvider?: string;
  contentSourceId?: string;
  role: MediaPlacementRole;
  placementIndex?: number;
  sourceLocator?: string;
  migrationRunId: string;
  provenance?: Record<string, unknown>;
};

export function relationshipUniquenessKey(input: Pick<ContentMediaRelationship, "mediaId" | "contentKey" | "role" | "placementIndex">) {
  return `${input.mediaId}\u0000${input.contentKey}\u0000${input.role}\u0000${input.placementIndex ?? -1}`;
}

export function createMediaRelationshipId(input: Pick<ContentMediaRelationship, "mediaId" | "contentKey" | "role" | "placementIndex">) {
  const digest = createHash("sha256").update(relationshipUniquenessKey(input)).digest("hex");
  return `media-rel:${digest}`;
}

export function validateMediaRelationship(input: ContentMediaRelationship) {
  if (!input.id || !input.mediaId || !input.contentKey || !input.migrationRunId) throw new Error("MEDIA_RELATIONSHIP_IDENTITY_REQUIRED");
  if (input.role === "featured" && input.placementIndex !== undefined) throw new Error("FEATURED_PLACEMENT_INDEX_FORBIDDEN");
  if (input.role === "inline" && (!Number.isInteger(input.placementIndex) || (input.placementIndex as number) < 0)) throw new Error("INLINE_PLACEMENT_INDEX_REQUIRED");
  if (input.sourceLocator && input.sourceLocator.length > 500) throw new Error("MEDIA_RELATIONSHIP_LOCATOR_TOO_LONG");
  if (input.id !== createMediaRelationshipId(input)) throw new Error("MEDIA_RELATIONSHIP_ID_NOT_DETERMINISTIC");
  return input;
}
