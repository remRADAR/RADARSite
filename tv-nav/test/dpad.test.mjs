/**
 * RADARSite TV — D-pad navigation test suite.
 *
 * Drives the real harness in headless Chromium at 1920x1080, sends real
 * ArrowUp/Down/Left/Right keydown events (what an Android TV remote emits),
 * and asserts the focus engine lands on the geometrically correct element.
 *
 * Run: node tv-nav/test/dpad.test.mjs
 * Exit code 0 = all assertions passed.
 */
import { chromium } from '/app/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.resolve(ROOT, '..', 'evidence', 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
let failures = 0;

function check(name, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures++;
  results.push({ name, ok, actual, expected });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        expected: ${expected}\n        actual:   ${actual}`}`);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('file://' + path.join(ROOT, 'index.html'), { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__nav, null, { timeout: 5000 });

const focusedId = () => page.evaluate(() => window.__tvFocus?.id ?? null);
const press = async (key, times = 1) => {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key);
    await page.waitForTimeout(30);
  }
};
const shot = async (name) => {
  await page.waitForTimeout(220); // let the 150ms focus transition settle
  await page.screenshot({ path: path.join(SHOTS, name) });
};

// ---------------------------------------------------------------- 1. initial
check('initial focus is the first focusable (Home)', await focusedId(), 'Home');
await shot('01-initial-focus.png');

// ------------------------------------------------- 2. horizontal rail traversal
await press('ArrowRight');
check('Right from Home -> Markets', await focusedId(), 'Markets');
await press('ArrowRight');
check('Right from Markets -> Watchlist', await focusedId(), 'Watchlist');
await press('ArrowRight');
check('Right from Watchlist -> Signals', await focusedId(), 'Signals');
await shot('02-nav-rail-signals.png');

// ------------------------------------------------------- 3. focus trap at edge
await press('ArrowRight');
check('Right at rail end is trapped (stays on Signals)', await focusedId(), 'Signals');
const edge = await page.evaluate(() => window.__tvEdge);
check('edge callback fired for right', edge, 'right');

// ------------------------------------------------- 4. vertical move into hero
await press('ArrowDown');
check('Down from nav -> hero primary action', await focusedId(), 'Open dashboard');
await shot('03-hero-focus.png');

// ------------------------------------------- 5. vertical move into first rail
await press('ArrowDown');
check('Down from hero -> first trending card (NVDA)', await focusedId(), 'NVDA');
await shot('04-trending-first-card.png');

// ------------------------------------------------ 6. horizontal card traversal
await press('ArrowRight');
check('Right in trending -> AMD', await focusedId(), 'AMD');
await press('ArrowRight');
check('Right in trending -> TSM', await focusedId(), 'TSM');
await shot('05-trending-third-card.png');

// ------------------------------------- 7. rail containment: no vertical escape
await press('ArrowDown');
check('Down from trending -> watchlist card (AAPL)', await focusedId(), 'AAPL');

// ------------------------------- 8. row memory: column preserved on return up
await press('ArrowUp');
const backUp = await focusedId();
check('Up from watchlist returns to same column (TSM)', backUp, 'TSM');
await shot('06-row-memory-return.png');

// ------------------------------------------- 9. long horizontal run + scroll
const overflow = await page.evaluate(() => {
  const rail = document.getElementById('rail-trending');
  return rail.scrollWidth - rail.clientWidth;
});
check('trending rail genuinely overflows (test is meaningful)', overflow > 0, true);

await press('ArrowRight', 6);
check('Right x6 from TSM -> TXN (last card)', await focusedId(), 'TXN');
const scrolled = await page.evaluate(() => {
  const rail = document.getElementById('rail-trending');
  return { left: rail.scrollLeft, max: rail.scrollWidth - rail.clientWidth };
});
check('rail auto-scrolled to reveal last card', scrolled.left > 0, true);
check('rail scroll did not exceed its own max', scrolled.left <= scrolled.max + 1, true);
await shot('07-rail-scrolled-last-card.png');

// ------------------------------------- 10. key-repeat guard (held key throttle)
const before = await page.evaluate(() => window.__tvFocus.moves);
await page.evaluate(() => {
  // Simulate a held key: 12 repeat events inside the 90ms throttle window.
  const el = document.activeElement;
  for (let i = 0; i < 12; i++) {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', repeat: true, bubbles: true, cancelable: true }));
  }
});
const after = await page.evaluate(() => window.__tvFocus.moves);
check('held-key repeat is throttled (<=2 moves from 12 repeats)', after - before <= 2, true);

// ------------------------------------------ 11. no page-level vertical scroll
const pageScroll = await page.evaluate(() => ({ y: window.scrollY, x: window.scrollX }));
check('page itself never scrolled (y=0)', pageScroll.y, 0);
check('page itself never scrolled (x=0)', pageScroll.x, 0);

// ------------------------------------------------ 12. focus ring is rendered
const ring = await page.evaluate(() => {
  const el = document.querySelector('[data-tv-focused="true"]');
  if (!el) return null;
  const s = getComputedStyle(el);
  return { transform: s.transform, boxShadow: s.boxShadow.slice(0, 40) };
});
check('focused element has a scale transform', ring && ring.transform !== 'none', true);
check('focused element has a focus ring (box-shadow)', ring && ring.boxShadow.length > 0, true);

// ------------------------------------------- 13. no runtime errors in the page
check('no page errors', errors.length, 0);
if (errors.length) console.log('  errors:', errors.slice(0, 5));

// ------------------------------------------------------------- final evidence
await page.evaluate(() => window.__nav.focus(document.getElementById('nav-home')));
await shot('08-final-home-focus.png');

await browser.close();

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} assertions passed`);
fs.writeFileSync(
  path.join(ROOT, '..', 'evidence', 'dpad-test-results.json'),
  JSON.stringify({ passed, total: results.length, failures, results }, null, 2),
);
console.log(failures === 0 ? 'RESULT: PASS' : `RESULT: FAIL - ${failures} assertion(s)`);
process.exit(failures === 0 ? 0 : 1);
