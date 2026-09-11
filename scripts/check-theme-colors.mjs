import { chromium } from "@playwright/test";

const baseURL = process.env.BASE_URL || "http://127.0.0.1:3800";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const results = [];
try {
  await page.goto(baseURL, { waitUntil: "networkidle" });
  for (const mode of ["dark", "light"]) {
    const currentMode = await page.evaluate(() => document.documentElement.classList.contains("theme-light") ? "light" : "dark");
    if (currentMode !== mode) {
      const toggle = page.getByRole("button", { name: new RegExp(`Switch to ${mode} mode`, "i") });
      await toggle.click();
    }
    await page.waitForTimeout(100);
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
        matchesSemanticTokens: marquees.every((item) => item.background && item.text && item.background !== item.text),
      };
    }, mode));
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
const failed = results.some((item) => !item.matchesSemanticTokens || item.marquees.some((marquee) => !marquee.background || !marquee.text || marquee.background === marquee.text));
if (failed) process.exitCode = 1;
