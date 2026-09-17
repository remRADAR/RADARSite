import { chromium } from "@playwright/test";

const baseURL = process.env.BASE_URL || "http://127.0.0.1:3800";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const results = [];
try {
  for (const mode of ["dark", "light"]) {
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    await page.evaluate((expectedMode) => window.localStorage.setItem("radarcharts-theme", expectedMode), mode);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction((expectedMode) => {
      const root = document.documentElement;
      return (root.classList.contains("theme-light") ? "light" : "dark") === expectedMode;
    }, mode);
    results.push(await page.evaluate((expectedMode) => {
      const computed = (node) => node ? getComputedStyle(node) : null;
      const root = getComputedStyle(document.documentElement);
      const marquees = [...document.querySelectorAll(".animate-marquee, .animate-marquee-reverse")].map((track) => {
        let surface = track.parentElement;
        while (surface && ["transparent", "rgba(0, 0, 0, 0)"].includes(computed(surface)?.backgroundColor || "")) surface = surface.parentElement;
        const text = track.querySelector("span");
        return {
          background: computed(surface)?.backgroundColor,
          text: computed(text)?.color,
        };
      });
      return {
        mode: expectedMode,
        rootTheme: document.documentElement.classList.contains("theme-light") ? "light" : "dark",
        marquees,
        paper: root.getPropertyValue("--paper").trim(),
        ink: root.getPropertyValue("--ink").trim(),
        matchesExpectedTheme: (document.documentElement.classList.contains("theme-light") ? "light" : "dark") === expectedMode,
        matchesSemanticTokens: marquees.every((item) => item.background && item.text && item.background !== item.text),
      };
    }, mode));
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
const failed = results.some((item) => !item.matchesExpectedTheme || !item.matchesSemanticTokens || item.marquees.some((marquee) => !marquee.background || !marquee.text || marquee.background === marquee.text));
if (failed) process.exitCode = 1;
