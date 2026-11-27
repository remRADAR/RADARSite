/**
 * Contrast audit — measures REAL computed colours in a real browser.
 *
 * For every visible text node it resolves the effective background by walking
 * ancestors until it finds a non-transparent paint, then computes the WCAG
 * contrast ratio. This catches the failures that a static grep cannot: a
 * component that inherits `--ink` onto a hard-coded dark panel, or a light
 * theme where a block kept its dark background.
 *
 * Usage: node scripts/contrast-audit.mjs [baseUrl] [--json out.json]
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.argv[2]?.startsWith("http") ? process.argv[2] : "http://localhost:3000";
const jsonIdx = process.argv.indexOf("--json");
const OUT = jsonIdx > -1 ? process.argv[jsonIdx + 1] : null;

const ROUTES = [
  "/",
  "/about",
  "/about/ecosystem",
  "/about/our-story",
  "/motherland",
  "/omajiverse",
  "/ontheradar",
  "/ontheradar/articles",
  "/ontheradar/events",
  "/ontheradar/magazine",
  "/playlists",
  "/radarmusic",
  "/radarmusic/artists",
  "/radarmusic/charts",
  "/radarmusic/legacies",
  "/radarmusic/podcast",
  "/radarmusic/releases",
  "/radarmusic/tracks",
  "/releases",
  "/remradar",
  "/stayaktiv",
  "/work",
  "/omolops",
  "/privacy",
  "/terms",
  "/login",
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const THEMES = ["dark", "light"];

/** Runs in the page. Returns every text element with its resolved colours. */
function collect() {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };

  const lum = ({ r, g, b }) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  const blend = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });

  /** Walk up until an opaque-enough background is found. */
  const effectiveBg = (el) => {
    let node = el;
    let acc = null;
    while (node && node !== document.documentElement.parentNode) {
      const cs = getComputedStyle(node);
      const bg = parse(cs.backgroundColor);
      const hasImg = cs.backgroundImage && cs.backgroundImage !== "none";
      if (bg && bg.a > 0) {
        acc = acc ? blend(acc, bg) : bg;
        if (acc.a >= 0.999) return { color: acc, image: hasImg };
      }
      if (hasImg) {
        // Can't measure an image; report it so the caller can skip.
        return { color: acc && acc.a > 0 ? acc : { r: 0, g: 0, b: 0, a: 1 }, image: true };
      }
      node = node.parentElement;
    }
    return { color: acc && acc.a > 0 ? acc : { r: 255, g: 255, b: 255, a: 1 }, image: false };
  };

  const out = [];
  const seen = new Set();

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const text = n.textContent.trim();
    if (!text || text.length < 2) continue;
    const el = n.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);

    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (parseFloat(cs.opacity) < 0.15) continue;

    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    // Off-screen / clipped
    if (rect.bottom < -50 || rect.top > window.innerHeight + 4000) continue;

    const fgRaw = parse(cs.color);
    if (!fgRaw) continue;

    const bgInfo = effectiveBg(el);
    const fg = fgRaw.a < 1 ? blend(fgRaw, bgInfo.color) : fgRaw;
    const cr = ratio(fg, bgInfo.color);

    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const isLarge = size >= 24 || (size >= 18.66 && weight >= 700);
    const min = isLarge ? 3 : 4.5;

    if (cr < min) {
      out.push({
        text: text.slice(0, 70),
        tag: el.tagName.toLowerCase(),
        cls: (el.className && typeof el.className === "string" ? el.className : "").slice(0, 90),
        fg: `rgb(${Math.round(fg.r)},${Math.round(fg.g)},${Math.round(fg.b)})`,
        bg: `rgb(${Math.round(bgInfo.color.r)},${Math.round(bgInfo.color.g)},${Math.round(bgInfo.color.b)})`,
        ratio: Math.round(cr * 100) / 100,
        min,
        size: Math.round(size),
        weight,
        overImage: bgInfo.image,
        y: Math.round(rect.top + window.scrollY),
      });
    }
  }
  return out;
}

const browser = await chromium.launch();
const findings = [];
let checked = 0;

/** The dev server can die under memory pressure; retry a route a few times. */
async function gotoWithRetry(page, url) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      return;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw lastErr;
}

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();

  for (const theme of THEMES) {
    for (const route of ROUTES) {
      const url = BASE + route;
      try {
        await gotoWithRetry(page, url);
        // Force the theme the same way the app does.
        await page.evaluate((t) => {
          document.documentElement.classList.remove("theme-light", "theme-dark");
          if (t === "light") document.documentElement.classList.add("theme-light");
          document.documentElement.setAttribute("data-theme", t);
          try { localStorage.setItem("radar-theme", t); } catch {}
        }, theme);
        await page.waitForTimeout(700);
        // Reveal anything gated behind scroll animations.
        await page.evaluate(async () => {
          const h = document.body.scrollHeight;
          for (let y = 0; y < h; y += 600) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 40));
          }
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(400);

        const res = await page.evaluate(collect);
        checked++;
        for (const f of res) {
          findings.push({ route, theme, viewport: vp.name, ...f });
        }
        // Persist after every page so a server crash cannot lose the run.
        if (OUT) writeFileSync(OUT, JSON.stringify({ checked, findings }, null, 2));
      } catch (e) {
        findings.push({ route, theme, viewport: vp.name, error: String(e).slice(0, 120) });
        if (OUT) writeFileSync(OUT, JSON.stringify({ checked, findings }, null, 2));
      }
    }
  }
  await ctx.close();
}

await browser.close();

// De-duplicate: same route+theme+text+colours across viewports is one issue.
const uniq = new Map();
for (const f of findings) {
  if (f.error) continue;
  const k = [f.route, f.theme, f.text, f.fg, f.bg].join("|");
  if (!uniq.has(k)) uniq.set(k, { ...f, viewports: [f.viewport] });
  else uniq.get(k).viewports.push(f.viewport);
}
const list = [...uniq.values()].sort((a, b) => a.ratio - b.ratio);

const errors = findings.filter((f) => f.error);

console.log(`\nScanned ${checked} page/theme/viewport combinations.`);
console.log(`Unique contrast failures: ${list.length}`);
if (errors.length) console.log(`Load errors: ${errors.length}`);

const byRoute = {};
for (const f of list) (byRoute[f.route] ||= []).push(f);

for (const [route, items] of Object.entries(byRoute)) {
  console.log(`\n### ${route}  (${items.length})`);
  for (const f of items.slice(0, 12)) {
    console.log(
      `  [${f.theme}/${f.viewports.join(",")}] ${f.ratio}:1 (min ${f.min}) ` +
        `${f.fg} on ${f.bg}${f.overImage ? " [over image]" : ""} ` +
        `<${f.tag} class="${f.cls}"> "${f.text}"`
    );
  }
  if (items.length > 12) console.log(`  … ${items.length - 12} more`);
}

if (OUT) {
  writeFileSync(OUT, JSON.stringify({ checked, failures: list, errors }, null, 2));
  console.log(`\nWrote ${OUT}`);
}
