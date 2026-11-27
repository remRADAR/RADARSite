import { chromium } from "playwright";

const BASE = process.env.BASE || "http://127.0.0.1:3100";
const checks = [
  { route: "/about", sel: '[data-testid="radar-explore"] h1', name: "explore" },
  { route: "/ontheradar/articles", sel: "h1", name: "articles" },
  { route: "/ontheradar", sel: "h1", name: "ontheradar" },
  { route: "/releases", sel: "h1", name: "releases" },
  { route: "/work", sel: "h1", name: "work" },
  { route: "/privacy", sel: "h1", name: "privacy" },
  { route: "/terms", sel: "h1", name: "terms" },
  { route: "/ontheradar/magazine", sel: "h1", name: "magazine" },
];
const widths = [1920, 1440, 1024, 768, 390];

const browser = await chromium.launch();
for (const c of checks) {
  const row = [];
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 1000 } });
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + c.route, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForTimeout(1800);
      const d = await page.evaluate((sel) => {
        const h = document.querySelector(sel);
        if (!h) return { err: "missing" };
        const cs = getComputedStyle(h);
        const r = h.getBoundingClientRect();
        return {
          fs: Math.round(parseFloat(cs.fontSize)),
          w: Math.round(r.width),
          docOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        };
      }, c.sel);
      row.push(`${w}:${d.fs ?? d.err}px${d.docOverflow ? " OVF" + d.docOverflow : ""}`);
    } catch (e) {
      row.push(`${w}:ERR`);
    }
    await ctx.close();
  }
  console.log(c.name.padEnd(12), row.join("  "));
}
await browser.close();
