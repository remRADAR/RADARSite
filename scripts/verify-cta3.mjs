import { chromium } from "playwright";

const BASE = process.env.BASE || "http://127.0.0.1:3100";
const widths = [2560, 1920, 1600, 1440, 1280, 1024, 820, 768, 430, 390, 360];

const browser = await chromium.launch();
const out = [];
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(2500);
    const d = await page.evaluate(() => {
      const h2 = document.querySelector('[data-testid="cta-section"] h2');
      if (!h2) return { error: "no h2" };
      const col = h2.getBoundingClientRect().width;
      const spans = [...h2.querySelectorAll(":scope > span")].map((s) => {
        const scs = getComputedStyle(s);
        const rects = [];
        for (const n of s.childNodes) {
          const r = document.createRange();
          r.selectNodeContents(n);
          for (const rc of r.getClientRects()) if (rc.width > 1) rects.push(rc);
        }
        const tops = [...new Set(rects.map((x) => Math.round(x.top)))];
        return { text: s.textContent.trim(), fontSize: scs.fontSize, lines: Math.max(tops.length, 1), textW: Math.round(Math.max(...rects.map((x) => x.width), 0)) };
      });
      return { col: Math.round(col), spans, maxTextW: Math.round(Math.max(...spans.map((s) => s.textW))), docOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth) };
    });
    out.push({ w, ...d });
  } catch (e) {
    out.push({ w, error: String(e).slice(0, 100) });
  }
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
