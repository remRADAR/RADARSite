import { test, expect, type Page } from "@playwright/test";

const freezeVisuals = async (page: Page) => {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        animation-iteration-count: 1 !important;
        transition: none !important;
        scroll-behavior: auto !important;
      }
      [data-hero-type] { transform: none !important; }
      [aria-label="Hero slides"] button { pointer-events: none !important; }
    `,
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            }),
      ),
    );
  });
  const firstSlide = page.getByRole("button", { name: "Show slide 1" });
  if (await firstSlide.count()) await firstSlide.click({ force: true });
};

test.describe("visual regression baselines", () => {
  test("homepage hero — desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });
    await freezeVisuals(page);

    await expect(page.locator("[data-hero-type]").locator("..")).toHaveScreenshot("homepage-hero-desktop.png", {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("homepage hero — mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });
    await freezeVisuals(page);

    await expect(page.locator("[data-hero-type]").locator("..")).toHaveScreenshot("homepage-hero-mobile.png", {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("work index — desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/work", { waitUntil: "networkidle" });
    await freezeVisuals(page);

    await expect(page.locator("main")).toHaveScreenshot("work-index-desktop.png", {
      animations: "disabled",
      caret: "hide",
      mask: [page.locator("[data-visual-regression-mask]")],
      scale: "css",
      maxDiffPixelRatio: 0.01,
    });
  });
});

// Update snapshots intentionally with:
// npx playwright test tests/e2e/visual-regression.spec.ts --update-snapshots
