import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseURL = process.env.BASE_URL || "http://127.0.0.1:3101";
const snapshot = JSON.parse(await fs.readFile("src/data/merged-content.json", "utf8"));
const outDir = path.resolve("qa-artifacts/editorial-images");
await fs.mkdir(outDir, { recursive: true });

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const categoryLabels = [...new Set((snapshot.articles || []).flatMap((article) => {
  const categories = Array.isArray(article.categories) ? article.categories.filter(Boolean) : [];
  return categories.length ? categories : article.section === "radar-articles" ? ["RADARArticles"] : ["Uncategorized"];
}))];
const articleRoutes = (snapshot.articles || []).map((article) => `/ontheradar/articles/${article.slug}`);
const categoryCounts = new Map(categoryLabels.map((label) => [label, 0]));
for (const article of snapshot.articles || []) {
  const categories = Array.isArray(article.categories) && article.categories.length ? article.categories : article.section === "radar-articles" ? ["RADARArticles"] : ["Uncategorized"];
  for (const category of categories) categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
}
const categoryRoutes = [...categoryCounts].flatMap(([label, count]) => Array.from({ length: Math.max(1, Math.ceil(count / 24)) }, (_, index) => `/ontheradar/articles/category/${slug(label)}/page/${index + 1}`));
const routes = [
  "/",
  "/ontheradar",
  "/ontheradar/articles",
  "/ontheradar/magazine",
  "/ontheradar/projects",
  "/ontheradar/events",
  "/motherland",
  ...categoryRoutes,
  ...articleRoutes,
];

const browser = await chromium.launch({ headless: true });
const results = [];
let nextIndex = 0;
const workers = Array.from({ length: Math.min(4, routes.length) }, async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  while (true) {
    const index = nextIndex++;
    if (index >= routes.length) break;
    const route = routes[index];
    const imageResponses = [];
    const requestFailures = [];
    page.on("response", (response) => {
      if (response.request().resourceType() === "image" && response.status() >= 400) imageResponses.push({ url: response.url(), status: response.status() });
    });
    page.on("requestfailed", (request) => {
      if (request.resourceType() === "image") requestFailures.push({ url: request.url(), error: request.failure()?.errorText || "request failed" });
    });
    const started = Date.now();
    let status = 0;
    let error = null;
    let imageState = [];
    try {
      const response = await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      status = response?.status() || 0;
      await page.waitForFunction(() => document.fonts?.status === "loaded", null, { timeout: 10_000 }).catch(() => {});
      await page.evaluate(async () => {
        const step = Math.max(window.innerHeight * 0.8, 500);
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 80));
        }
        window.scrollTo(0, 0);
        await new Promise((resolve) => setTimeout(resolve, 500));
      });
      await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 20_000 }).catch(() => {});
      imageState = await page.locator("img").evaluateAll((images) => images.map((image) => ({
        src: image.currentSrc || image.src,
        alt: image.alt,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      })));
      const broken = imageState.filter((image) => image.naturalWidth === 0);
      if (status >= 400 || broken.length || imageResponses.length || requestFailures.length) {
        const safeName = `${String(index + 1).padStart(3, "0")}-${route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home"}`;
        await page.screenshot({ path: path.join(outDir, `${safeName}.png`), fullPage: true }).catch(() => {});
      }
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }
    results.push({ route, status, imageCount: imageState.length, brokenImages: imageState.filter((image) => image.naturalWidth === 0), imageResponses, requestFailures, error, durationMs: Date.now() - started });
    page.removeAllListeners("response");
    page.removeAllListeners("requestfailed");
  }
  await context.close();
});
await Promise.all(workers);
await browser.close();

results.sort((a, b) => a.route.localeCompare(b.route));
const report = {
  generatedAt: new Date().toISOString(),
  baseURL,
  routeCount: routes.length,
  articleRouteCount: articleRoutes.length,
  categoryRouteCount: categoryRoutes.length,
  results,
  summary: {
    routesWithHttpErrors: results.filter((result) => result.status >= 400 || result.error).length,
    routesWithBrokenImages: results.filter((result) => result.brokenImages.length || result.imageResponses.length || result.requestFailures.length).length,
    imageElements: results.reduce((sum, result) => sum + result.imageCount, 0),
    brokenImageElements: results.reduce((sum, result) => sum + result.brokenImages.length, 0),
    failedImageResponses: results.reduce((sum, result) => sum + result.imageResponses.length, 0),
    failedImageRequests: results.reduce((sum, result) => sum + result.requestFailures.length, 0),
  },
};
await fs.writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ output: path.join(outDir, "report.json"), ...report.summary }, null, 2));
if (report.summary.routesWithHttpErrors || report.summary.routesWithBrokenImages) process.exitCode = 1;
