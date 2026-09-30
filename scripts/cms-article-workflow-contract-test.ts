import assert from "node:assert/strict";
import { normalizeArticleInput } from "@/app/api/studio/route";
import { buildArticleJsonLd, serializeJsonLd } from "@/lib/article-schema";

const added = normalizeArticleInput({
  id: "workflow-test",
  title: "Abuja Afrobeats Signal",
  slug: "abuja-afrobeats-signal",
  excerpt: "A first draft.",
  bodyHtml: "<p>Abuja music and Afrobeats.</p>",
  editorialType: "Spotlight",
  projectSection: "Motherland",
  tags: ["manual-approved"],
  tagsApproved: ["manual-approved"],
  categories: ["RADARArticles"],
  featuredImage: "https://cdn.example/cover.webp",
  featuredImageAlt: "Artist portrait",
  featuredImageCaption: "A verified caption",
  author: "Editorial Desk",
  status: "draft",
  date: "2026-09-29",
  metaTitle: "Abuja Signal",
  metaDescription: "A metadata description.",
  canonicalUrl: "https://radar.example/articles/abuja-afrobeats-signal",
  socialImage: "https://cdn.example/social.webp",
});
assert.equal(added.status, "draft");
assert.equal(added.editorialType, "Spotlight");

const edited = normalizeArticleInput({ id: "workflow-test", title: "Abuja Afrobeats Signal — Updated", bodyHtml: "<p>Updated Abuja music story.</p>" }, added);
assert.equal(edited.title, "Abuja Afrobeats Signal — Updated");
assert.equal(edited.status, "draft");
for (const key of ["excerpt", "projectSection", "author", "date", "featuredImage", "featuredImageAlt", "featuredImageCaption", "metaTitle", "metaDescription", "canonicalUrl", "socialImage"] as const) {
  assert.equal(edited[key], added[key], `${key} must survive an unrelated partial edit`);
}
assert.equal(edited.editorialType, added.editorialType, "taxonomy must survive an unrelated partial edit");
assert.deepEqual(edited.categories, added.categories);
assert.deepEqual(edited.tagsApproved, ["manual-approved"], "approved tags must survive an edit payload that omits tag fields");
assert.deepEqual(edited.tags, ["manual-approved"], "manual tags must survive an edit payload that omits tag fields");

const selected = normalizeArticleInput({ id: "workflow-test", excerpt: "Changed deck", metaDescription: "Changed SEO description", status: "published" }, edited);
assert.equal(selected.excerpt, "Changed deck");
assert.equal(selected.metaDescription, "Changed SEO description");
assert.equal(selected.status, "published");
assert.equal(selected.featuredImage, added.featuredImage);

const cleared = normalizeArticleInput({ id: "workflow-test", featuredImageCaption: null, socialImage: null }, selected);
assert.equal(cleared.featuredImageCaption, "");
assert.equal(cleared.socialImage, "");
assert.equal(cleared.featuredImage, added.featuredImage);
assert.equal(cleared.metaTitle, added.metaTitle);

const magazine = normalizeArticleInput({ ...edited, editorialType: "Magazine", magazineSubtype: "Special Episode" }, edited);
assert.equal(magazine.editorialType, "Magazine");
assert.equal(magazine.magazineSubtype, "Special Episode");
assert.throws(() => normalizeArticleInput({ ...edited, editorialType: "Magazine", magazineSubtype: "" }, edited), /requires/);

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

const hostile = serializeJsonLd({ headline: "</script><script>alert('x')</script> & <tag>" });
assert.ok(!hostile.includes("</script>"), "serialized JSON-LD must not contain a raw closing script tag");
assert.ok(hostile.includes("\\u003c/script\\u003e"), "script delimiters must be escaped as JSON data");
const reparsed = JSON.parse(hostile) as { headline: string };
assert.equal(reparsed.headline, "</script><script>alert('x')</script> & <tag>");

console.log(JSON.stringify({ add: "PASS", partialUpdatePreservation: "PASS", selectedFieldUpdate: "PASS", explicitClear: "PASS", taxonomy: "PASS", approvedTagPreservation: "PASS", pressJsonLd: "PASS", spotlightJsonLd: "PASS", magazineJsonLd: "PASS", jsonLdScriptSafety: "PASS", databaseContacted: false, productionModified: false }, null, 2));
