import { chromium } from "playwright";

const BASE = process.env.BASE || "https://radarcharts.net";
const routes = [
  "/", "/about", "/about/ecosystem", "/remradar",
  "/ontheradar", "/ontheradar/articles", "/ontheradar/events", "/ontheradar/magazine",
  "/radarmusic", "/radarmusic/podcast", "/radarmusic/charts", "/radarmusic/artists",
  "/radarmusic/releases", "/radarmusic/tracks", "/radarmusic/legacies",
  "/playlists", "/releases", "/stayaktiv", "/omajiverse", "/motherland", "/work",
  "/omolops", "/privacy", "/terms",
];
const widths = [1920, 1600, 1440, 1280];

const browser = await chromium.launch();
const report = [];

for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 1080 } });
  for (const route of routes) {
    const page = await ctx.newPage();
    let status = 0;
    try {
      const resp = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60000 });
      status = resp?.status() ?? 0;
      await page.waitForTimeout(1600);
      const issues = await page.evaluate(() => {
        const out = { wrapped: [], btnWrapped: [], docOverflow: 0 };
        out.docOverflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);

        const inScroller = (el) => {
          let p = el.parentElement;
          while (p && p !== document.body) {
            const pr = p.getBoundingClientRect();
            if (pr.width > window.innerWidth + 4) return true;
            const pcs = getComputedStyle(p);
            if (["auto", "scroll", "hidden"].includes(pcs.overflowX) && p.scrollWidth > p.clientWidth + 4) return true;
            p = p.parentElement;
          }
          return false;
        };

        // Count REAL visual lines by measuring the text node's own client rects.
        // Padding/borders cannot inflate this, unlike height/lineHeight.
        const countLines = (el) => {
          const rects = [];
          for (const n of el.childNodes) {
            if (n.nodeType !== 3 || !n.textContent.trim()) continue;
            const r = document.createRange();
            r.selectNodeContents(n);
            for (const rc of r.getClientRects()) if (rc.width > 1 && rc.height > 1) rects.push(rc);
          }
          if (!rects.length) return 0;
          // group rects by their top edge (same visual line)
          const tops = [...new Set(rects.map((r) => Math.round(r.top)))].sort((a, b) => a - b);
          return tops.length;
        };

        const blocks = [...document.querySelectorAll("h1,h2,h3,h4,p,li,dt,dd,span,a,button,strong,label")];
        for (const el of blocks) {
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;
          if (inScroller(el)) continue;
          const lines = countLines(el);
          if (lines >= 2) {
            const rec = {
              tag: el.tagName,
              cls: (el.className || "").toString().slice(0, 60),
              text: (el.textContent || "").trim().slice(0, 50),
              lines,
              w: Math.round(r.width),
            };
            if (el.tagName === "BUTTON" || el.tagName === "A") out.btnWrapped.push(rec);
            else out.wrapped.push(rec);
          }
        }
        const key = (o) => o.tag + "|" + o.cls + "|" + o.text;
        for (const k of ["wrapped", "btnWrapped"]) {
          const seen = new Set();
          out[k] = out[k].filter((o) => { const kk = key(o); if (seen.has(kk)) return false; seen.add(kk); return true; });
        }
        return out;
      });
      const total = issues.wrapped.length + issues.btnWrapped.length;
      if (total > 0 || issues.docOverflow > 0) report.push({ w, route, status, docOverflow: issues.docOverflow, ...issues });
    } catch (e) {
      report.push({ w, route, status, error: String(e).slice(0, 120) });
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 1));
