import assert from "node:assert/strict";
import type { CmsRecord } from "@/lib/content-server";
import { paginateRecords, recordsForEditorialType, recordsForMagazineSubtype, recordsForProject, sortEditorialRecords } from "@/lib/editorial-archives";

const fixture: CmsRecord[] = [
  { slug: "legacy-press", title: "Legacy press", editorialType: "article", categories: ["RADARArticles"], date: "2026-01-01", sourceUrl: "https://remradar.wordpress.com/2026/01/01/legacy" },
  { slug: "current-press", title: "Current press", editorialType: "article", categories: ["RADARArticles"], date: "2025-01-01", sourceUrl: "https://radarcharts.net/2025/01/01/current" },
  { slug: "artist-spotlight", title: "Artist Spotlight: Example", editorialType: "interview", categories: ["MOTHERLand", "RADARArticles"], date: "2026-02-01", sourceUrl: "https://remradar.wordpress.com/2026/02/01/spotlight" },
  { slug: "magazine-special", title: "Special episode", editorialType: "magazine", categories: ["TALK TO US: Special Guest Episodes"], date: "2026-03-01", sourceUrl: "https://remradar.wordpress.com/2026/03/01/special" },
  { slug: "magazine-episode", title: "Magazine episode", editorialType: "magazine", categories: ["TALK TO US: Magazine Series"], date: "2026-04-01", sourceUrl: "https://remradar.wordpress.com/2026/04/01/episode" },
  { slug: "draft-press", title: "Private draft", editorialType: "article", status: "draft", categories: ["RADARArticles"], date: "2026-05-01", sourceUrl: "https://radarcharts.net/2026/05/01/draft" },
];

const press = recordsForEditorialType(fixture, "Press");
const spotlight = recordsForEditorialType(fixture, "Spotlight");
const magazine = recordsForEditorialType(fixture, "Magazine");
assert.deepEqual(press.map((item) => item.slug), ["current-press", "legacy-press"]);
assert.deepEqual(spotlight.map((item) => item.slug), ["artist-spotlight"]);
assert.deepEqual(magazine.map((item) => item.slug), ["magazine-episode", "magazine-special"]);
assert.equal(recordsForMagazineSubtype(fixture, "Special Episode")[0]?.slug, "magazine-special");
assert.equal(recordsForMagazineSubtype(fixture, "Magazine Episode")[0]?.slug, "magazine-episode");
const notionEditorialRecords: CmsRecord[] = [
  { slug: "notion-press", title: "Published Notion Press article", editorialType: "Press", sourceProvider: "notion", status: "published" },
  { slug: "notion-spotlight", title: "Published Notion Spotlight article", editorialType: "Spotlight", sourceProvider: "notion", status: "published" },
];
const adminPressRecord: CmsRecord = {
  slug: "styling-is-choosing-life-with-aye-lawa-feat-wyza",
  title: "Published admin Press article",
  editorialType: "Press",
  sourceProvider: "radarsite",
  status: "published",
};
assert.equal(recordsForEditorialType([adminPressRecord], "Press")[0]?.slug, adminPressRecord.slug, "published admin CMS content appears in Press");
assert.deepEqual(recordsForEditorialType(notionEditorialRecords, "Press").map((item) => item.slug), ["notion-press"]);
assert.deepEqual(recordsForEditorialType(notionEditorialRecords, "Spotlight").map((item) => item.slug), ["notion-spotlight"]);
assert.deepEqual(recordsForProject(fixture).map((item) => item.slug), ["artist-spotlight"]);
assert.equal(paginateRecords(press, 1, 1).pageCount, 2);
assert.deepEqual(paginateRecords(press, 2, 1).items.map((item) => item.slug), ["legacy-press"]);
assert.deepEqual(sortEditorialRecords([...press]).map((item) => item.slug), ["current-press", "legacy-press"]);
console.log(JSON.stringify({ filtering: "PASS", motherlandOverlap: "PASS", magazineSubtypes: "PASS", pagination: "PASS", currentBeforeLegacy: "PASS", draftsExcluded: "PASS" }, null, 2));
