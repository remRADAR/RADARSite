import { chromium } from "@playwright/test";

const baseURL = process.env.BASE_URL || "http://127.0.0.1:3700";
const viewports = [
  { width: 320, height: 568, label: "mobile-narrow" },
  { width: 390, height: 844, label: "mobile" },
  { width: 768, height: 1024, label: "tablet" },
  { width: 1280, height: 720, label: "desktop" },
];
const routes = ["/", "/about", "/radarmusic", "/work"];
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const viewport of viewports) {
    for (const route of routes) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
      const metrics = await page.evaluate(() => {
        const viewportWidth = document.documentElement.clientWidth;
        const locks = [...document.querySelectorAll(".punctuation-lock")].map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            text: element.textContent?.trim() || "",
            width: Math.round(rect.width * 100) / 100,
            height: Math.round(rect.height * 100) / 100,
            right: Math.round(rect.right * 100) / 100,
            fitsViewport: rect.right <= viewportWidth + 1,
          };
        });
        const headings = [...document.querySelectorAll("h1, h2, h3")].map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            text: element.textContent?.trim().slice(0, 80) || "",
            right: Math.round(rect.right * 100) / 100,
            fitsViewport: rect.right <= viewportWidth + 1,
          };
        });
        return { locks, headings, documentWidth: document.documentElement.scrollWidth, viewportWidth };
      });
      results.push({ ...viewport, route, errors, ...metrics });
      await page.close();
    }
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
const failures = results.filter((item) => item.errors.length || item.documentWidth > item.viewportWidth + 1 || item.locks.some((lock) => !lock.fitsViewport) || item.headings.some((heading) => !heading.fitsViewport));
if (failures.length) process.exitCode = 1;
