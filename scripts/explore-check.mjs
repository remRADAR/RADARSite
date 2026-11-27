import { chromium } from "playwright";

const BASE = process.env.BASE || "http://127.0.0.1:3100";
const browser = await chromium.launch();
for (const w of [1920, 1440, 1024, 768, 390]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/about", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2000);
  const d = await page.evaluate(() => {
    const h = document.querySelector('[data-testid="radar-explore"] h1');
    if (!h) return { err: "no h1" };
    const cs = getComputedStyle(h);
    const r = h.getBoundingClientRect();
    const rects = [];
    for (const n of h.childNodes) {
      if (n.nodeType === 3 && n.textContent.trim()) {
        const rg = document.createRange();
        rg.selectNodeContents(n);
        for (const rc of rg.getClientRects()) if (rc.width > 1) rects.push(rc);
      }
    }
    const tops = [...new Set(rects.map((x) => Math.round(x.top)))];
    return {
      fs: cs.fontSize,
      w: Math.round(r.width),
      h: Math.round(r.height),
      lines: tops.length,
      text: h.textContent.trim().slice(0, 40),
      docOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    };
  });
  console.log(w, JSON.stringify(d));
  await ctx.close();
}
await browser.close();
