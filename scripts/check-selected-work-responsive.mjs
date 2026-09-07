import { chromium } from "@playwright/test";

const baseUrl = process.env.BASE_URL || "https://radarsite-staging.vercel.app";
const viewports = [
  { name: "desktop-short", width: 1280, height: 720 },
  { name: "desktop-standard", width: 1280, height: 900 },
  { name: "tablet", width: 768, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true });
const results = [];
for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  await page.locator("section").filter({ hasText: "Selected Work" }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  const result = await page.evaluate(() => {
    const section = [...document.querySelectorAll("section")].find((node) => node.textContent?.includes("Selected Work"));
    const rail = section?.querySelector("div.relative.hidden");
    const card = [...(rail?.querySelectorAll("a[href^='/work/']") || [])].find((node) => node.getBoundingClientRect().width > 0);
    const meta = card?.querySelector("div.flex.items-start.justify-between span:last-child");
    const r = rail?.getBoundingClientRect();
    const c = card?.getBoundingClientRect();
    const m = meta?.getBoundingClientRect();
    return {
      rail: r && { top: r.top, bottom: r.bottom, width: r.width, height: r.height },
      card: c && { top: c.top, bottom: c.bottom, width: c.width, height: c.height },
      metadata: m && { top: m.top, bottom: m.bottom, width: m.width, height: m.height, text: meta.textContent?.trim() },
      metadataVisible: Boolean(m && m.width > 0 && m.height > 0 && m.bottom > 0 && m.top < innerHeight),
      railFitsViewport: Boolean(r && r.height <= innerHeight + 1),
      viewport: { width: innerWidth, height: innerHeight, scrollY },
    };
  });
  await page.screenshot({ path: `preview-selected-work-${viewport.name}-${viewport.width}x${viewport.height}.png`, fullPage: false });
  results.push({ ...viewport, ...result });
  await page.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
