import { test, expect } from "@playwright/test";

test.describe("Client dashboard", () => {
  test("visiting /dashboard shows the current project list", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back");
    await expect(page.getByText("Current projects")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Halcyon Relaunch" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Vantage 14-City Tour" })).toBeVisible();
  });

  test("sidebar navigation reaches projects and briefs", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", { name: "Projects" }).first().click();
    await expect(page).toHaveURL("/projects");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("All Projects");

    await page.getByRole("link", { name: "Briefs" }).first().click();
    await expect(page).toHaveURL("/briefs");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Submitted");
  });
});
