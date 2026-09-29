import assert from "node:assert/strict";
import { createMediaRelationshipId, relationshipUniquenessKey, validateMediaRelationship, type ContentMediaRelationship } from "../src/lib/media-relationships";

const base = { mediaId: "media:legacy:4420", migrationRunId: "run-2026-09-29-fixtures" };

function relation(input: Omit<ContentMediaRelationship, "id">): ContentMediaRelationship {
  const id = createMediaRelationshipId(input);
  return { ...input, id };
}

async function main() {
  const featured = relation({ ...base, contentKey: "legacy:4754", contentSourceProvider: "legacy", contentSourceId: "4754", role: "featured", provenance: { fixture: "featured-jpeg" } });
  const sharedInlineA = relation({ ...base, contentKey: "legacy:4509", contentSourceProvider: "legacy", contentSourceId: "4509", role: "inline", placementIndex: 0, sourceLocator: "img:4420:0" });
  const sharedInlineB = relation({ ...base, contentKey: "legacy:4427", contentSourceProvider: "legacy", contentSourceId: "4427", role: "inline", placementIndex: 2, sourceLocator: "img:4420:2" });
  const secondInline = relation({ ...base, contentKey: "legacy:4509", contentSourceProvider: "legacy", contentSourceId: "4509", role: "inline", placementIndex: 1, sourceLocator: "img:4420:1" });

  for (const item of [featured, sharedInlineA, sharedInlineB, secondInline]) assert.deepEqual(validateMediaRelationship(item), item);
  assert.notEqual(sharedInlineA.id, sharedInlineB.id);
  assert.notEqual(sharedInlineA.id, secondInline.id);
  assert.equal(relationshipUniquenessKey(sharedInlineA), `${sharedInlineA.mediaId}\u0000legacy:4509\u0000inline\u00000`);
  assert.equal(sharedInlineB.mediaId, sharedInlineA.mediaId, "same asset is reused without duplicating the media identity");
  assert.equal(new Set([sharedInlineA.contentKey, sharedInlineB.contentKey]).size, 2, "shared asset supports multiple articles");

  assert.throws(() => validateMediaRelationship({ ...featured, id: createMediaRelationshipId({ ...featured, placementIndex: 0 }), placementIndex: 0 }), /FEATURED_PLACEMENT_INDEX_FORBIDDEN/);
  assert.throws(() => validateMediaRelationship({ ...sharedInlineA, id: createMediaRelationshipId({ ...sharedInlineA, placementIndex: undefined }), placementIndex: undefined }), /INLINE_PLACEMENT_INDEX_REQUIRED/);
  assert.throws(() => validateMediaRelationship({ ...featured, id: "media-rel:manual" }), /MEDIA_RELATIONSHIP_ID_NOT_DETERMINISTIC/);

  console.log(JSON.stringify({
    deterministicIds: "PASS",
    featuredRole: "PASS",
    sharedAssetAcrossArticles: "PASS",
    multipleInlinePlacementsOrdered: "PASS",
    invalidFeaturedPlacementRejected: "PASS",
    invalidInlinePlacementRejected: "PASS",
    manualRelationshipIdRejected: "PASS",
    databaseContacted: false,
    productionMutations: false,
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
