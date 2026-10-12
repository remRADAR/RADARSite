import { revalidatePath, revalidateTag } from "next/cache";
import {
  contentCacheTag, deleteMediaRelationship, listMediaRelationshipsByContent,
  readContentSnapshotReadOnly, readContentWriteSnapshot, upsertMediaRelationship,
  writeContentIfUnchanged,
} from "@/lib/content-server";
import { importNotionImage, notionR2ConfigurationReady } from "@/lib/notion-media";

// Keep side effects behind one server-only object so route-level contracts can
// exercise publication state transitions with isolated in-memory substitutes.
export const notionPublishRuntime = {
  contentCacheTag,
  readContentSnapshotReadOnly,
  readContentWriteSnapshot,
  writeContentIfUnchanged,
  listMediaRelationshipsByContent,
  deleteMediaRelationship,
  upsertMediaRelationship,
  importNotionImage,
  notionR2ConfigurationReady,
  revalidateTag,
  revalidatePath,
};
