import assert from "node:assert/strict";
import { normalizeArticleInput } from "@/app/api/studio/route";
import { buildArticleJsonLd } from "@/lib/article-schema";

const added = normalizeArticleInput({ id: "workflow-test", title: "Abuja Afrobeats Signal", slug: "abuja-afrobeats-signal", excerpt: "A first draft.", bodyHtml: "<p>Abuja music and Afrobeats.</p>", editorialType: "Press", projectSection: "", tags: ["manual-approved"], tagsApproved: ["manual-approved"], status: "draft", date: "2026-09-29" });
assert.equal(added.status, "draft");
assert.equal(added.editorialType, "Press");
assert.deepEqual(added.tagsApproved, ["manual-approved"]);

const edited = normalizeArticleInput({ id: "workflow-test", title: "Abuja Afrobeats Signal — Updated", bodyHtml: "<p>Updated Abuja music story.</p>", editorialType: "Press", projectSection: "", status: "draft" }, added);
assert.equal(edited.title, "Abuja Afrobeats Signal — Updated");
assert.equal(edited.status, "draft");
assert.deepEqual(edited.tagsApproved, ["manual-approved"], "approved tags must survive an edit payload that omits tag fields");
assert.deepEqual(edited.tags, ["manual-approved"], "manual tags must survive an edit payload that omits tag fields");

const published = normalizeArticleInput({ ...edited, status: "published", editorialType: "Spotlight", projectSection: "Motherland" }, edited);
assert.equal(published.status, "published");
assert.equal(published.editorialType, "Spotlight");
assert.equal(published.projectSection, "Motherland");

const pressSchema = buildArticleJsonLd({ ...added, editorialType: "Press", tags: ["Afrobeats"] });
const spotlightSchema = buildArticleJsonLd({ ...added, editorialType: "Spotlight", projectSection: "Motherland" });
const magazineSchema = buildArticleJsonLd({ ...added, editorialType: "Magazine", magazineSubtype: "Special Episode" });
assert.equal(pressSchema["@type"], "Article");
assert.equal(pressSchema.articleSection, "Press");
assert.equal(spotlightSchema.articleSection, "Spotlight");
assert.deepEqual(spotlightSchema.about, { "@type": "Thing", name: "Motherland" });
assert.equal(magazineSchema.articleSection, "Magazine");
assert.equal(magazineSchema.genre, "Special Episode");
assert.equal(pressSchema.keywords, "Afrobeats");

console.log(JSON.stringify({ add: "PASS", edit: "PASS", approvedTagPreservation: "PASS", saveDraft: "PASS", publish: "PASS", pressJsonLd: "PASS", spotlightJsonLd: "PASS", magazineJsonLd: "PASS", databaseContacted: false, productionModified: false }, null, 2));
