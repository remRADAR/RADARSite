import { expect, test } from "@playwright/test";

test.describe("Hero cube engine", () => {
  test("renders genuine 3D cube geometry", async ({ page }) => {
    await page.goto("/");
    const scene = page.locator(".hero-cube-scene");
    await expect(scene).toBeAttached();
    const cube = page.locator(".hero-cube").first();
    await expect(cube).toBeVisible();
    const perspective = await scene.evaluate((el) => getComputedStyle(el).perspective);
    expect(perspective).not.toBe("none");
    const transformStyle = await cube.evaluate((el) => getComputedStyle(el).transformStyle);
    expect(transformStyle).toBe("preserve-3d");
    const faces = page.locator(".hero-cube-face");
    expect(await faces.count()).toBeGreaterThanOrEqual(4);
    const culled = await faces.first().evaluate((el) => getComputedStyle(el).backfaceVisibility);
    expect(culled).toBe("hidden");
  });

  test("cube rotates outward on navigation", async ({ page }) => {
    await page.goto("/");
    const cube = page.locator(".hero-cube").first();
    await expect(cube).toBeVisible();
    await page.getByRole("button", { name: "Next hero image" }).click();
    await expect
      .poll(async () => cube.evaluate((el) => getComputedStyle(el).transform))
      .toContain("matrix3d");
  });

  test("reduced motion keeps the cube static", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    const cube = page.locator(".hero-cube").first();
    await expect(cube).toBeVisible();
    const transition = await cube.evaluate((el) => getComputedStyle(el).transitionProperty);
    expect(transition).toContain("none");
    await context.close();
  });
});
