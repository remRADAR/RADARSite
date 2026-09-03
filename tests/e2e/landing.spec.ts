import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("hero loads with headline, nav, and no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("remembering");
    await expect(page.getByRole("link", { name: "Northlight" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Work" }).first()).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("selected work section links through to a case study", async ({ page }) => {
    // Use a mobile viewport: the Selected Work section renders a plain stacked
    // list there (the desktop variant is a pinned scrub-crossfade whose entries
    // fade/disable as you scroll, which makes clicking a specific one racy).
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const link = page.getByRole("link", { name: "View case study" }).first();
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await expect(page).toHaveURL(/\/work\/.+/, { timeout: 15_000 });
  });
});
