import assert from "node:assert/strict";
import { buildArticleLibrary } from "@/app/api/studio/route";
import type { CmsRecord } from "@/lib/content-server";

process.env.DATABASE_URL = "";

const fixture: CmsRecord[] = [
  { id: "press-1", slug: "zeta-release", title: "Zeta Release", excerpt: "A press note", status: "published", editorialType: "Press", date: "2026-09-01", tags: ["release"], categories: ["RADARArticles"] },
  { id: "spotlight-1", slug: "alpha-spotlight", title: "Alpha Spotlight", excerpt: "Artist profile", status: "published", editorialType: "Spotlight", projectSection: "Motherland", date: "2026-09-12", tags: ["artist", "motherland"], categories: ["Discovery Spot"] },
  { id: "magazine-1", slug: "beta-special", title: "Beta Special", excerpt: "Long-form interview", status: "draft", editorialType: "Magazine", magazineSubtype: "Special Episode", date: "2026-09-20", tags: ["interview"], categories: ["Magazine"] },
  { id: "magazine-2", slug: "gamma-episode", title: "Gamma Episode", excerpt: "A magazine episode", status: "published", editorialType: "Magazine", magazineSubtype: "Magazine Episode", date: "2026-09-18", tags: ["interview"], categories: ["Magazine"] },
  { id: "press-2", slug: "delta-news", title: "Delta News", excerpt: "Another release", status: "archived", editorialType: "Press", date: "2026-08-01", tags: ["release"], categories: ["RADARArticles"] },
  { id: "spotlight-2", slug: "epsilon-spotlight", title: "Epsilon Spotlight", excerpt: "Another artist profile", status: "published", editorialType: "Spotlight", date: "2026-09-05", tags: ["artist"], categories: ["Discovery Spot"] },
];

function query(input: Record<string, string>) { return new URLSearchParams(input); }

const defaultPage = buildArticleLibrary(fixture, query({ page: "1", pageSize: "2" }));
assert.equal(defaultPage.pagination.total, 6);
assert.equal(defaultPage.pagination.pageSize, 5);
assert.equal(defaultPage.pagination.pageCount, 2);
assert.deepEqual(defaultPage.items.map((item) => item.id), ["magazine-1", "magazine-2", "spotlight-1", "spotlight-2", "press-1"]);

const filtered = buildArticleLibrary(fixture, query({ editorialType: "Magazine", magazineSubtype: "Special Episode", status: "draft", pageSize: "25" }));
assert.equal(filtered.pagination.total, 1);
assert.equal(filtered.items[0]?.id, "magazine-1");
assert.equal(filtered.items[0]?.magazineSubtype, "Special Episode");

const searched = buildArticleLibrary(fixture, query({ search: "MOTHERLAND", pageSize: "25" }));
assert.deepEqual(searched.items.map((item) => item.id), ["spotlight-1"]);
assert.equal(searched.items[0]?.projectSection, "Motherland");

const titleAscending = buildArticleLibrary(fixture, query({ sort: "title", direction: "asc", pageSize: "25" }));
assert.deepEqual(titleAscending.items.map((item) => item.title), ["Alpha Spotlight", "Beta Special", "Delta News", "Epsilon Spotlight", "Gamma Episode", "Zeta Release"]);

const dateAscending = buildArticleLibrary(fixture, query({ sort: "date", direction: "asc", pageSize: "25" }));
assert.equal(dateAscending.items[0]?.id, "press-2");
assert.equal(dateAscending.items.at(-1)?.id, "magazine-1");

assert.deepEqual(defaultPage.taxonomy.editorialTypes, ["Press", "Spotlight", "Magazine"]);
assert.deepEqual(defaultPage.taxonomy.magazineSubtypes, ["Special Episode", "Magazine Episode"]);
assert.deepEqual(defaultPage.taxonomy.projectSections, ["Motherland"]);

console.log(JSON.stringify({
  validation: "PASS",
  databaseContacted: false,
  fixtureRecords: fixture.length,
  checks: ["pagination", "defaultDateSort", "editorialFilter", "magazineSubtypeFilter", "statusFilter", "searchAcrossTaxonomy", "titleSort", "ascendingDateSort", "taxonomyOptions"],
}, null, 2));
