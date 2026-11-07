import { test, expect, type Page } from "@playwright/test";

/**
 * Responsive matrix — the production-readiness stabilization gate.
 *
 * Asserts the two contracts the stabilization work introduced:
 *
 *  1. No public route scrolls horizontally at any width in the supported
 *     viewport matrix (320 → 2560) or across the Tailwind breakpoint edges
 *     (767/768, 1023/1024, 1279/1280).
 *  2. First-frame geometry: the sticky header plus the hero surface fill
 *     exactly one viewport — the hero ticker lands on the fold line and the
 *     next section does not intrude into the first frame.
 *
 * A green production build proves the pages compile; it says nothing about
 * how they render at width. This spec is the runnable proxy for the visual
 * audit when no interactive browser session is available.
 */

const MOBILE = [320, 360, 375, 390, 414, 430] as const;
const TABLET = [600, 768, 820, 1024] as const;
const DESKTOP = [1280, 1366, 1440, 1600, 1920, 2560] as const;
const MATRIX = [...MOBILE, ...TABLET, ...DESKTOP];

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/about/our-story",
  "/about/ecosystem",
  "/motherland",
  "/ontheradar",
  "/ontheradar/articles",
  "/ontheradar/magazine",
  "/ontheradar/projects",
  "/ontheradar/events",
  "/radarmusic",
  "/radarmusic/artists",
  "/radarmusic/releases",
  "/work",
  "/privacy",
  "/terms",
] as const;

const VIEWPORT_HEIGHT = 900;

async function expectNoHorizontalOverflow(page: Page) {
  const width = page.viewportSize()?.width ?? 0;
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  // 1px tolerance covers sub-pixel rounding on fractional viewport scales;
  // anything wider is real horizontal scrolling or clipped content.
  expect(overflow, "horizontal overflow at " + width + "px").toBeLessThanOrEqual(1);
}

test.describe("Responsive matrix", () => {
  for (const width of MATRIX) {
    test("homepage renders without horizontal overflow at " + width + "px", async ({ page }) => {
      await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
      await page.goto("/");
      await expectNoHorizontalOverflow(page);
    });
  }

  test("breakpoint edges render without horizontal overflow", async ({ page }) => {
    for (const width of [767, 768, 1023, 1024, 1279, 1280]) {
      await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
      await page.goto("/");
      await expectNoHorizontalOverflow(page);
    }
  });

  test("homepage first frame ends exactly at the fold", async ({ page }) => {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
      await page.goto("/");

      const hero = page.locator("section.hero-shell");
      await expect(hero).toBeVisible();
      const heroBox = await hero.boundingBox();
      expect(heroBox, "hero box at " + width + "px").toBeTruthy();

      // Header (58px) + hero (100svh - 58px) = exactly one viewport.
      expect(Math.abs(heroBox!.y + heroBox!.height - VIEWPORT_HEIGHT)).toBeLessThanOrEqual(2);

      // The ticker rides the bottom edge of the hero: fully visible in the
      // first viewport, not pushed under the fold.
      const ticker = hero.locator(".ticker-surface").first();
      const tickerBox = await ticker.boundingBox();
      expect(tickerBox).toBeTruthy();
      expect(tickerBox!.y).toBeGreaterThan(0);
      expect(tickerBox!.y + tickerBox!.height).toBeLessThanOrEqual(VIEWPORT_HEIGHT + 2);
    }
  });

  test("MOTHERLand hero fills the first frame at mobile, tablet and desktop", async ({ page }) => {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
      await page.goto("/motherland");

      const hero = page.locator('section[aria-label="MOTHERLand hero"]');
      await expect(hero).toBeVisible();
      const box = await hero.boundingBox();
      expect(box, "MOTHERLand hero box at " + width + "px").toBeTruthy();

      // Sits directly under the sticky chrome, ends exactly at the fold.
      expect(box!.y).toBeGreaterThan(0);
      expect(Math.abs(box!.y + box!.height - VIEWPORT_HEIGHT)).toBeLessThanOrEqual(2);

      await expectNoHorizontalOverflow(page);
    }
  });

  for (const route of PUBLIC_ROUTES) {
    test(route + " renders without horizontal overflow across device classes", async ({ page }) => {
      for (const width of [360, 768, 1440]) {
        await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
        await page.goto(route);
        await expectNoHorizontalOverflow(page);
      }
    });
  }
});
