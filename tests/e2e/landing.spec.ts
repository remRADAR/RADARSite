import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("hero loads with headline, nav, and no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("RADAR");
    await expect(page.getByRole("link", { name: "remRADAR — home" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "THE RADARMusic" }).first()).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("primary navigation links into the ON THE RADAR gateway", async ({ page }) => {
    // Desktop viewport so the primary nav bar renders (mobile collapses it
    // behind the menu button). The homepage no longer carries a "View case
    // study" section, so navigation itself is the click-through contract.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.getByRole("link", { name: "ON THE RADAR" }).first().click();
    await expect(page).toHaveURL(/\/ontheradar$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Stories");
  });
});
