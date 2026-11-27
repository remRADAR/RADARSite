import { chromium } from "playwright";

const BASE = process.env.BASE || "https://radarcharts.net";
const widths = [2560, 1920, 1600, 1440, 1280, 1024, 820, 768, 430, 390, 360];

const browser = await chromium.launch();
const out = [];
for (const w of widths) {
  const page = await browser.newPage({ viewport: { width: w, height: 1000 } });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  const d = await page.evaluate(() => {
    const h2 = document.querySelector('[data-testid="cta-section"] h2');
    if (!h2) return { error: "no h2" };
    const cs = getComputedStyle(h2);
    const lh = parseFloat(cs.lineHeight);
    const h = h2.getBoundingClientRect().height;
    const spans = [...h2.querySelectorAll(":scope > span")].map((s) => {
      const scs = getComputedStyle(s);
      const slh = parseFloat(scs.lineHeight);
      const sh = s.getBoundingClientRect().height;
      return {
        text: s.textContent.trim(),
        h: Math.round(sh),
        lh: Math.round(slh),
        lines: Math.round(sh / slh),
        w: Math.round(s.getBoundingClientRect().width),
      };
    });
    return {
      fontSize: cs.fontSize,
      lineHeight: Math.round(lh),
      h2Height: Math.round(h),
      totalLines: Math.round(h / lh),
      h2Width: Math.round(h2.getBoundingClientRect().width),
      fontFamily: cs.fontFamily,
      textWrap: cs.textWrap,
      spans,
    };
  });
  out.push({ w, ...d });
  await page.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
