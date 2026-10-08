import fs from "node:fs/promises";

const base = (process.env.QA_BASE_URL || "http://127.0.0.1:3202").replace(/\/$/, "");
const snapshot = JSON.parse(await fs.readFile("src/data/merged-content.json", "utf8"));
const magazineArticle = (snapshot.articles || []).find((item) => String(item.editorialType || "").toLowerCase() === "magazine" && typeof item.slug === "string");
const routes = [
  { label: "Press article", path: "/ontheradar/articles/mbbszn-unveils-pause-if-you-must-but-dont-stop-a-project-rooted-in-resilience-reinvention-a-new-wave-of-alt-afrofusion-storytelling", type: "article" },
  { label: "Spotlight article", path: "/ontheradar/articles/kendol-ignites-a-new-wave-with-get-down-groove-a-bold-soulful-leap-into-afro-fusions-future", type: "article" },
  { label: "Motherland article", path: "/ontheradar/articles/artist-spotlight-wealth-asuquo-abujas-livewire-afrobeats-star-on-a-relentless-rise", type: "article" },
  { label: "Motherland project", path: "/motherland", type: "collection" },
  { label: "Magazine archive", path: "/ontheradar/magazine", type: "collection" },
  ...(magazineArticle ? [{ label: "Magazine story", path: `/ontheradar/magazine/${magazineArticle.slug}`, type: "article" }] : []),
  { label: "Missing article", path: "/ontheradar/articles/this-route-does-not-exist-qa", type: "missing" },
];

function parseJsonLd(html) {
  return [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((match) => JSON.parse(match[1]));
}
function flatten(value) { return Array.isArray(value) ? value.flatMap(flatten) : [value]; }
function types(data) { return flatten(data).flatMap((item) => Array.isArray(item?.["@graph"]) ? item["@graph"] : [item]).map((item) => item?.["@type"]).filter(Boolean); }
function hasUnsafeHost(value) { return /localhost|127\.0\.0\.1|vercel\.app|wordpress|supabase/i.test(value); }

const results = [];
for (const route of routes) {
  const response = await fetch(`${base}${route.path}`);
  const html = await response.text();
  const data = parseJsonLd(html);
  const flat = flatten(data).flatMap((item) => Array.isArray(item?.["@graph"]) ? item["@graph"] : [item]);
  const articleNodes = flat.filter((item) => item?.["@type"] === "Article");
  const breadcrumbNodes = flat.filter((item) => item?.["@type"] === "BreadcrumbList");
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
  const issues = [];
  if (route.type === "missing") {
    if (response.status !== 404) issues.push(`expected HTTP 404, got ${response.status}`);
  } else if (response.status !== 200) issues.push(`HTTP ${response.status}`);
  if (route.type !== "missing" && !data.length) issues.push("no JSON-LD blocks");
  if (route.type === "article" && articleNodes.length !== 1) issues.push(`expected exactly one Article node, got ${articleNodes.length}`);
  if (route.type === "article" && breadcrumbNodes.length !== 1) issues.push(`expected exactly one BreadcrumbList node, got ${breadcrumbNodes.length}`);
  if (route.type === "collection" && !flat.some((item) => item?.["@type"] === "CollectionPage")) issues.push("missing CollectionPage node");
  if (route.type !== "missing" && !flat.some((item) => item?.["@type"] === "BreadcrumbList")) issues.push("missing BreadcrumbList node");
  for (const node of articleNodes) {
    for (const field of ["headline", "description", "url", "mainEntityOfPage", "publisher"]) if (!node[field]) issues.push(`Article missing ${field}`);
    if (hasUnsafeHost(JSON.stringify(node))) issues.push("unsafe host in Article JSON-LD");
    if (node.url && !node.url.startsWith("https://radarcharts.net/")) issues.push(`non-production Article URL ${node.url}`);
    if (canonical && node.url !== canonical) issues.push(`Article URL ${node.url} does not match canonical ${canonical}`);
  }
  if (hasUnsafeHost(JSON.stringify(flat))) issues.push("unsafe host in JSON-LD");
  results.push({ label: route.label, path: route.path, status: response.status, jsonLdTypes: types(data), articleCount: articleNodes.length, issues });
}

const report = { generatedAt: new Date().toISOString(), base, ok: results.every((result) => result.issues.length === 0), results };
await fs.mkdir("qa-artifacts/seo", { recursive: true });
await fs.writeFile("qa-artifacts/seo/jsonld-report.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
