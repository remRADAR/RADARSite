import { expect, test } from "@playwright/test";

const backgroundPath = "/images/errors/remradar-404.webp";

test("renders the image-led 404 page with only the home fallback", async ({ page }) => {
  const imageResponse = await page.request.get(backgroundPath);
  expect(imageResponse.ok()).toBeTruthy();
  expect(imageResponse.headers()["content-type"]).toContain("image/webp");

  const response = await page.goto("/this-route-does-not-exist");
  expect(response?.status()).toBe(404);

  const main = page.locator("main#main-content");
  const background = main.locator("img");
  await expect(background).toHaveAttribute("alt", "");
  await expect(background).toHaveAttribute("sizes", "100vw");
  await background.evaluate((image) => (image as HTMLImageElement).decode());
  await expect.poll(() => background.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(main.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/");
  await expect(main.locator("a")).toHaveCount(1);
  await expect(main.locator("h1, h2, p, nav")).toHaveCount(0);
  await expect(main.getByRole("link", { name: "Return home" })).toBeVisible();
  await page.screenshot({ path: "test-results/remradar-404-desktop.png" });
});

test("fits the 404 background and fallback button to a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto("/this-route-does-not-exist");
  expect(response?.status()).toBe(404);

  const main = page.locator("main#main-content");
  await expect(main.getByRole("link", { name: "Return home" })).toBeVisible();
  const background = main.locator("img");
  await background.evaluate((image) => (image as HTMLImageElement).decode());
  await expect.poll(() => background.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await page.screenshot({ path: "test-results/remradar-404-mobile.png" });
});
