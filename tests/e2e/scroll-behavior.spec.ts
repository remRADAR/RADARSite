import { test, expect } from "@playwright/test";

test.describe("Scroll and hover behavior", () => {
  test("scrolling the landing page and hovering pillar links raises no JS errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");

    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(150);
    }

    const pillarLink = page.getByRole("link", { name: /MOTHERLand/i }).first();
    await pillarLink.scrollIntoViewIfNeeded();
    await pillarLink.hover();
    await page.waitForTimeout(300);

    expect(errors).toEqual([]);
  });

  test("case study pinned sections scroll without JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/work/mamuzo-dark-era-peak-release");

    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(150);
    }

    expect(errors).toEqual([]);
  });
});
