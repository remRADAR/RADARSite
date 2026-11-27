import { test, expect } from "@playwright/test";

const widths = [320, 360, 390, 430, 768, 1024, 1280];
const routes = ["/", "/work", "/about", "/radarmusic", "/ontheradar", "/dashboard", "/login"];

test.describe("site fix responsive audit", () => {
  for (const width of widths) {
    test(`homepage remains usable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "networkidle" });
      await expect(page.getByText("(02) AKT!V", { exact: true })).toBeVisible();
      await expect(page.getByText("ECOSYSTEM", { exact: true }).first()).toBeVisible();
      await expect(page.getByRole("heading", { name: "ARTICLES" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "MOTHERLand" })).toBeVisible();
      await expect(page.locator('a[aria-label="remRADAR — home"]')).toBeVisible();
      expect(await page.evaluate(() => ({ overflowX: getComputedStyle(document.documentElement).overflowX, bodyOverflowX: getComputedStyle(document.body).overflowX }))).toEqual({ overflowX: "hidden", bodyOverflowX: "hidden" });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(16);
      expect(await page.evaluate(() => document.body.scrollWidth - document.body.clientWidth)).toBeLessThanOrEqual(16);
    });
  }

  for (const route of routes) {
    test(`route ${route} has no page-level horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto(route, { waitUntil: "networkidle" });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(16);
      expect(await page.evaluate(() => document.body.scrollWidth - document.body.clientWidth)).toBeLessThanOrEqual(16);
    });
  }

  test("reduced motion disables the ticker animation", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 900 } });
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "networkidle" });
    expect(await page.locator(".animate-marquee").first().evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
    await context.close();
  });

  for (const [width, height] of [[360, 740], [390, 844], [430, 932], [767, 1024], [768, 1024], [1024, 768]]) {
    test(`stayAKTiV has no overflow at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/stayaktiv", { waitUntil: "networkidle" });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
      expect(await page.evaluate(() => document.body.scrollWidth - window.innerWidth)).toBe(0);
    });
  }
});
