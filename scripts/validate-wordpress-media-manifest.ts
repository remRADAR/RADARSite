import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const manifestPath = path.join(process.cwd(), "reports/wordpress-media-migration-manifest-2026-09-29/migration-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
  media: Array<Record<string, unknown>>;
  relationships: Array<Record<string, unknown>>;
  unresolvedReferences: Array<Record<string, unknown>>;
  summary: Record<string, number | Record<string, unknown>>;
};

const failures: string[] = [];
const fail = (message: string) => failures.push(message);
const requiredString = (value: unknown, label: string, index: number) => {
  if (typeof value !== "string" || !value.trim()) fail(`${label}[${index}] is required`);
};

const mediaIds = new Set<string>();
const mediaSourceById = new Map<string, string>();
for (const [index, item] of manifest.media.entries()) {
  const id = item.mediaIdentity;
  requiredString(id, "mediaIdentity", index);
  if (typeof id !== "string") continue;
  if (mediaIds.has(id)) fail(`duplicate media identity: ${id}`);
  mediaIds.add(id);
  const source = item.sourceUrl;
  requiredString(source, "sourceUrl", index);
  if (typeof source === "string") {
    const previous = mediaSourceById.get(id);
    if (previous && previous !== source) fail(`conflicting source identity: ${id}`);
    mediaSourceById.set(id, source);
  }
  if (item.provider !== "radarcharts" && item.provider !== "legacy") fail(`invalid provider: ${String(item.provider)}`);
  if (item.attachmentId == null && !id.includes(":url:")) fail(`URL-only media must use URL identity: ${id}`);
  if (item.attachmentId != null && !id.endsWith(`:${String(item.attachmentId)}`)) fail(`attachment identity mismatch: ${id}`);
}

const relationshipIds = new Set<string>();
const relationshipKeys = new Set<string>();
const articleMediaRoles = new Map<string, Set<string>>();
for (const [index, item] of manifest.relationships.entries()) {
  for (const field of ["relationshipId", "articleIdentity", "articleId", "mediaIdentity", "role", "sourceLocator", "sourceUrl"]) requiredString(item[field], field, index);
  const relationshipId = item.relationshipId;
  const mediaIdentity = item.mediaIdentity;
  const articleIdentity = item.articleIdentity;
  const role = item.role;
  const placement = item.inlineOrder;
  if (typeof relationshipId === "string" && relationshipIds.has(relationshipId)) fail(`duplicate relationship identity: ${relationshipId}`);
  if (typeof relationshipId === "string") relationshipIds.add(relationshipId);
  if (typeof mediaIdentity === "string" && !mediaIds.has(mediaIdentity)) fail(`relationship references missing media: ${mediaIdentity}`);
  if (role !== "featured" && role !== "inline") fail(`invalid relationship role: ${String(role)}`);
  if (role === "featured" && placement !== null) fail(`featured relationship has inline order: ${String(placement)}`);
  if (role === "inline" && (!Number.isInteger(placement) || Number(placement) < 0)) fail(`inline relationship has invalid order: ${String(placement)}`);
  if (typeof mediaIdentity === "string" && typeof articleIdentity === "string") {
    const key = `${mediaIdentity}\0${articleIdentity}\0${String(role)}\0${placement === null ? -1 : String(placement)}`;
    if (relationshipKeys.has(key)) fail(`duplicate relationship key: ${key}`);
    relationshipKeys.add(key);
    const roleSet = articleMediaRoles.get(articleIdentity) || new Set<string>();
    if (role === "featured" && roleSet.has("featured")) fail(`multiple featured relationships for article: ${articleIdentity}`);
    roleSet.add(String(role));
    articleMediaRoles.set(articleIdentity, roleSet);
  }
}

for (const item of manifest.media) {
  if (item.sharedAcrossArticles !== (Array.isArray(item.articles) && item.articles.length > 1)) fail(`inconsistent shared-media flag: ${String(item.mediaIdentity)}`);
  if (item.sharedAcrossArticles && (!item.relationshipCount || Number(item.relationshipCount) < 2)) fail(`shared media has insufficient relationship count: ${String(item.mediaIdentity)}`);
}
for (const [index, item] of manifest.unresolvedReferences.entries()) {
  requiredString(item.articleId, "unresolved.articleId", index);
  if (item.status !== "needs-review") fail(`unresolved reference is not needs-review at index ${index}`);
}

const summary = manifest.summary;
assert.equal(summary.uniqueMediaIdentities, manifest.media.length, "summary media count mismatch");
assert.equal(summary.featuredRelationships, manifest.relationships.filter((item) => item.role === "featured").length, "summary featured count mismatch");
assert.equal(summary.inlineRelationships, manifest.relationships.filter((item) => item.role === "inline").length, "summary inline count mismatch");
assert.equal(summary.unresolvedArticleRelationships, manifest.unresolvedReferences.length, "summary unresolved count mismatch");
if (failures.length) throw new Error(failures.join("\n"));
console.log(JSON.stringify({
  manifest: "PASS",
  duplicateMediaIdentities: "PASS",
  duplicateRelationshipIdentities: "PASS",
  requiredFields: "PASS",
  rolesAndOrdering: "PASS",
  sourceIdentityConflicts: "PASS",
  sharedMediaConsistency: "PASS",
  unresolvedReferencesExplicit: "PASS",
  mediaCount: manifest.media.length,
  relationshipCount: manifest.relationships.length,
  unresolvedCount: manifest.unresolvedReferences.length,
  productionMutations: false,
}, null, 2));
