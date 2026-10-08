import fs from "node:fs/promises";

const baseURL = (process.env.BASE_URL || "https://radarcharts.net").replace(/\/$/, "");
const snapshot = JSON.parse(await fs.readFile(new URL("../src/data/merged-content.json", import.meta.url), "utf8"));

function categorySlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const labels = [...new Set((snapshot.articles || []).flatMap((article) => {
  const categories = Array.isArray(article.categories) ? article.categories.filter(Boolean) : [];
  return categories.length ? categories : article.section === "radar-articles" ? ["RADARArticles"] : ["Uncategorized"];
}))];
const counts = new Map(labels.map((label) => [label, 0]));
for (const article of snapshot.articles || []) {
  const categories = Array.isArray(article.categories) && article.categories.length
    ? article.categories
    : article.section === "radar-articles" ? ["RADARArticles"] : ["Uncategorized"];
  for (const category of categories) counts.set(category, (counts.get(category) || 0) + 1);
}

const articleRoutes = (snapshot.articles || [])
  .filter((article) => typeof article.slug === "string" && article.slug)
  .map((article) => `/ontheradar/articles/${article.slug}`);
const categoryRoutes = [...counts].flatMap(([label, count]) => Array.from(
  { length: Math.max(1, Math.ceil(count / 24)) },
  (_, index) => `/ontheradar/articles/category/${categorySlug(label)}/page/${index + 1}`,
));
const recentArticleRoutes = [
  "/ontheradar/articles/styling-is-choosing-life-with-aye-lawa-feat-wyza",
  "/ontheradar/articles/telman-releases-if-not-god-a-bold-gospel-drill-anthem",
];
const routes = [...new Set([
  "/",
  "/ontheradar",
  "/ontheradar/articles",
  "/ontheradar/magazine",
  "/ontheradar/projects",
  "/ontheradar/events",
  "/motherland",
  ...categoryRoutes,
  ...articleRoutes,
  ...recentArticleRoutes,
])];

const concurrency = Number(process.env.CONCURRENCY || 16);
const timeoutMs = Number(process.env.TIMEOUT_MS || 30_000);
const headers = { "user-agent": "RADAR-live-route-verifier/1.0", accept: "text/html,application/xhtml+xml" };

async function check(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseURL}${path}`, { headers, redirect: "manual", signal: controller.signal });
    return { path, status: response.status, bytes: Number(response.headers.get("content-length") || 0), location: response.headers.get("location") || "" };
  } catch (error) {
    return { path, status: "ERROR", error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

const started = Date.now();
const results = [];
let next = 0;
async function worker() {
  while (next < routes.length) results.push(await check(routes[next++]));
}
await Promise.all(Array.from({ length: Math.min(concurrency, routes.length) }, worker));
results.sort((a, b) => a.path.localeCompare(b.path));
const failures = results.filter((result) => result.status !== 200);
const summary = {
  baseURL,
  routeCount: routes.length,
  elapsedSeconds: Number(((Date.now() - started) / 1000).toFixed(2)),
  passed: results.length - failures.length,
  failed: failures.length,
  failures,
};
console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exitCode = 1;
