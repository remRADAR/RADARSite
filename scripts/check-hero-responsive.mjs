import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3200";
const viewports = [
  { width: 320, height: 568, label: "mobile-small" },
  { width: 375, height: 812, label: "mobile-medium" },
  { width: 390, height: 844, label: "mobile" },
  { width: 768, height: 1024, label: "tablet" },
  { width: 1024, height: 768, label: "tablet-wide" },
  { width: 1280, height: 720, label: "desktop" },
  { width: 1440, height: 900, label: "desktop-wide" },
  { width: 1920, height: 1080, label: "ultrawide" },
];

await fs.mkdir("preview", { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `preview/hero-${viewport.label}-${viewport.width}x${viewport.height}.png` });
  const menuButton = page.locator('button[aria-controls="mobile-navigation"]');
  let menuMetrics = null;
  if (await menuButton.isVisible()) {
    await menuButton.click();
    menuMetrics = await page.evaluate(() => {
      const header = document.querySelector("header")?.getBoundingClientRect();
      const hero = document.querySelector("[data-hero-type]")?.closest("section")?.getBoundingClientRect();
      const main = document.querySelector("main")?.getBoundingClientRect();
      return {
        expanded: document.querySelector("#mobile-navigation") !== null,
        headerBottom: header?.bottom ?? null,
        heroTop: hero?.top ?? null,
        mainTop: main?.top ?? null,
        scrollY: window.scrollY,
      };
    });
    await menuButton.click();
  }
  const metrics = await page.evaluate(() => {
    const hero = document.querySelector("[data-hero-type]")?.closest("section");
    const heroImage = hero?.querySelector("img");
    const socialLinks = [...document.querySelectorAll('footer a[aria-label^="Follow remRADAR"]')];
    const heroRect = hero?.getBoundingClientRect();
    const imageRect = heroImage?.getBoundingClientRect();
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      hero: heroRect ? { left: heroRect.left, right: heroRect.right, width: heroRect.width, height: heroRect.height } : null,
      image: imageRect ? { left: imageRect.left, right: imageRect.right, width: imageRect.width, height: imageRect.height } : null,
      imageObjectFit: heroImage ? getComputedStyle(heroImage).objectFit : null,
      imageLoaded: heroImage ? heroImage.complete && heroImage.naturalWidth > 0 : false,
      imageSrc: heroImage?.getAttribute("src") ?? null,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      overflowRight: [...document.querySelectorAll("body *")].map((node) => ({
        tag: node.tagName,
        className: typeof node.className === "string" ? node.className : "",
        right: node.getBoundingClientRect().right,
        intentionalMarquee: Boolean(node.closest(".animate-marquee, .animate-marquee-reverse")),
        intentionalHorizontalRail: Boolean(node.closest(".cursor-grab")),
      })).filter((item) => item.right > window.innerWidth + 1 && !item.intentionalMarquee && !item.intentionalHorizontalRail).sort((a, b) => b.right - a.right).slice(0, 5),
      socialCount: socialLinks.length,
      socialLabels: socialLinks.map((link) => link.getAttribute("aria-label")),
    };
  });
  results.push({ ...viewport, ...metrics, menuMetrics, errors });
  await page.close();
}

await browser.close();
await fs.writeFile("preview/hero-responsive-results.json", `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));
