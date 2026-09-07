import { chromium } from "@playwright/test";

const baseUrl = process.env.BASE_URL || "https://radarsite-staging.vercel.app";
const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 900 },
]) {
  const page = await browser.newPage({ viewport });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const button = page.getByRole("button", { name: "Menu" });
  const before = await page.evaluate(() => ({ bodyHeight: document.body.scrollHeight, overflow: document.documentElement.scrollWidth - innerWidth }));
  await button.click();
  await page.waitForTimeout(550);
  const open = await page.evaluate(() => {
    const menu = document.querySelector("#mobile-navigation");
    const hero = document.querySelector("[data-hero]") || document.querySelector("main");
    const menuRect = menu?.getBoundingClientRect();
    const heroRect = hero?.getBoundingClientRect();
    return {
      ariaExpanded: document.querySelector("button[aria-controls='mobile-navigation']")?.getAttribute("aria-expanded"),
      ariaHidden: menu?.getAttribute("aria-hidden"),
      menuHeight: menuRect?.height,
      heroTop: heroRect?.top,
      bodyHeight: document.body.scrollHeight,
      overflow: document.documentElement.scrollWidth - innerWidth,
      transition: menu ? getComputedStyle(menu).transitionDuration : null,
    };
  });
  await page.getByRole("button", { name: "Close" }).click();
  await page.waitForTimeout(550);
  const closed = await page.evaluate(() => {
    const menu = document.querySelector("#mobile-navigation");
    return {
      ariaExpanded: document.querySelector("button[aria-controls='mobile-navigation']")?.getAttribute("aria-expanded"),
      ariaHidden: menu?.getAttribute("aria-hidden"),
      menuHeight: menu?.getBoundingClientRect().height,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  results.push({ viewport, before, open, closed });
  await page.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
