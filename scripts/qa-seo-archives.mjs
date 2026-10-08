import fs from "node:fs/promises";

const base = (process.env.QA_BASE_URL || "http://127.0.0.1:3202").replace(/\/$/, "");
const productionHost = "https://radarcharts.net";
const ARTICLES_PER_PAGE = 10;
const knownCollectionPaths = [
  "/ontheradar",
  "/ontheradar/articles",
  "/ontheradar/events",
  "/ontheradar/magazine",
  "/ontheradar/projects",
  "/motherland",
  "/radarmusic",
  "/radarmusic/artists",
  "/radarmusic/releases",
  "/projects",
  "/work",
];
const aliasExpectations = new Map([
  ["/ontheradar/discovery", "/ontheradar/articles/spotlight/page/1"],
  ["/ontheradar/talk-to-us", "/ontheradar/magazine"],
  ["/ontheradar/motherland", "/motherland"],
]);

function pathsFromSitemap(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)]
    .map((match) => {
      try { return new URL(match[1]).pathname; } catch { return null; }
    })
    .filter(Boolean);
}

function isArchivePath(path) {
  return knownCollectionPaths.includes(path)
    || /^\/ontheradar\/articles\/(press|spotlight)\/page\/\d+$/.test(path)
    || /^\/ontheradar\/articles\/category\/[^/]+\/page\/\d+$/.test(path);
}

function categorySlug(label) {
  return encodeURIComponent(label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
}

function articleCategories(record) {
  const values = (record.categories || []).map((value) => String(value).trim()).filter(Boolean);
  if (!values.length && String(record.section || "").toLowerCase() === "radar-articles") return ["RADARArticles"];
  return values.length ? [...new Set(values)] : ["Uncategorized"];
}

function editorialType(record) {
  const explicit = String(record.editorialType || "").trim();
  if (explicit === "Press" || explicit === "Spotlight" || explicit === "Magazine") return explicit;
  const legacy = explicit.toLowerCase();
  const haystack = `${record.title || ""} ${record.slug || ""}`.toLowerCase();
  const categories = [...(record.categories || []), ...(record.tags || [])].join(" ");
  if (legacy === "spotlight" || /discovery spot/i.test(categories) || /artist[\s-]+(spotlight|discovery)|\bspotlight\b/.test(haystack)) return "Spotlight";
  if (legacy === "magazine" || /talk to us.*(magazine|special guest)/i.test(categories)) return "Magazine";
  if (legacy === "article" || legacy === "interview" || /radararticles/i.test(categories)) return "Press";
  return "";
}

function parseJsonLd(html) {
  const blocks = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { blocks.push(JSON.parse(match[1])); } catch { /* report below through the empty/invalid count */ }
  }
  return blocks;
}

function flatten(value) {
  return Array.isArray(value) ? value.flatMap(flatten) : [value];
}

function nodes(data) {
  return flatten(data).flatMap((item) => Array.isArray(item?.["@graph"]) ? item["@graph"] : [item]);
}

function types(data) {
  return nodes(data).map((item) => item?.["@type"]).filter(Boolean);
}

function unsafeHost(value) {
  return /localhost|127\.0\.0\.1|vercel\.app|wordpress|supabase/i.test(value);
}

const sitemapResponse = await fetch(`${base}/sitemap.xml`);
const sitemapXml = await sitemapResponse.text();
const sitemapPaths = pathsFromSitemap(sitemapXml);
const snapshot = JSON.parse(await fs.readFile("src/data/merged-content.json", "utf8"));
const articles = snapshot.articles || [];
const labels = [...new Set(articles.flatMap(articleCategories))].sort((a, b) => a.localeCompare(b));
const categoryPaths = labels.flatMap((label) => {
  const total = Math.max(1, Math.ceil(articles.filter((article) => articleCategories(article).some((value) => value.toLowerCase() === label.toLowerCase())).length / ARTICLES_PER_PAGE));
  return Array.from({ length: total }, (_, index) => `/ontheradar/articles/category/${categorySlug(label)}/page/${index + 1}`);
});
const editorialPaths = ["Press", "Spotlight"].flatMap((type) => {
  const total = Math.max(1, Math.ceil(articles.filter((article) => editorialType(article) === type).length / ARTICLES_PER_PAGE));
  const prefix = type.toLowerCase();
  return Array.from({ length: total }, (_, index) => `/ontheradar/articles/${prefix}/page/${index + 1}`);
});
const paths = [...new Set([
  ...sitemapPaths.filter(isArchivePath),
  ...categoryPaths,
  ...editorialPaths,
  ...knownCollectionPaths,
  ...aliasExpectations.keys(),
  "/ontheradar/articles/press/page/999",
  "/ontheradar/articles/spotlight/page/999",
  "/ontheradar/articles/category/not-a-real-category/page/1",
])].sort();

const results = [];
for (const path of paths) {
  const response = await fetch(`${base}${path}`, { redirect: "manual" });
  const html = await response.text();
  const data = parseJsonLd(html);
  const flat = nodes(data);
  const canonicalValues = [...html.matchAll(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
  const location = response.headers.get("location");
  const expectedAlias = aliasExpectations.get(path);
  const isInvalidPagination = /\/page\/999$/.test(path) || path.includes("/category/not-a-real-category/");
  const issues = [];

  if (expectedAlias) {
    if (![301, 302, 303, 307, 308].includes(response.status)) issues.push(`expected redirect to ${expectedAlias}, got HTTP ${response.status}`);
    if (location && new URL(location, base).pathname !== expectedAlias) issues.push(`redirected to ${new URL(location, base).pathname}, expected ${expectedAlias}`);
  } else if (isInvalidPagination) {
    if (response.status !== 404) issues.push(`expected invalid archive route to return HTTP 404, got ${response.status}`);
  } else {
    if (response.status !== 200) issues.push(`HTTP ${response.status}`);
    if (!data.length) issues.push("no parseable JSON-LD blocks");
    if (!flat.some((item) => item?.["@type"] === "BreadcrumbList")) issues.push("missing BreadcrumbList node");
    if (!flat.some((item) => item?.["@type"] === "CollectionPage")) issues.push("missing CollectionPage node");
    if (canonicalValues.length !== 1) issues.push(`expected exactly one canonical link, got ${canonicalValues.length}`);
    if (canonicalValues.length === 1 && canonicalValues[0] !== productionHost && !canonicalValues[0].startsWith(`${productionHost}/`)) issues.push(`non-production canonical ${canonicalValues[0]}`);
    if (unsafeHost(JSON.stringify({ data, canonicalValues }))) issues.push("unsafe host in JSON-LD or canonical metadata");
  }

  results.push({ path, status: response.status, location, canonicalValues, jsonLdTypes: types(data), issues });
}

const report = {
  generatedAt: new Date().toISOString(),
  base,
  sitemapStatus: sitemapResponse.status,
  sitemapRouteCount: sitemapPaths.length,
  auditedRouteCount: results.length,
  ok: results.every((result) => result.issues.length === 0),
  results,
};
await fs.mkdir("qa-artifacts/seo", { recursive: true });
await fs.writeFile("qa-artifacts/seo/archive-taxonomy-report.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
