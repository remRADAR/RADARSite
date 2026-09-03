import { test, expect } from "@playwright/test";

test.describe("Case study page", () => {
  test("navigating from the work grid opens a case study with its key sections", async ({
    page,
  }) => {
    await page.goto("/work");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.getByRole("link", { name: /Halcyon/ }).first().click();
    await expect(page).toHaveURL("/work/halcyon-rebrand");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Rebuilding a century-old spirits house"
    );
    await expect(page.getByText("The Challenge")).toBeVisible();
    await expect(page.getByText("The Approach")).toBeVisible();
    await expect(page.getByText("Results")).toBeVisible();
    await expect(page.getByText("Credits")).toBeVisible();
    await expect(page.getByText("Next case study")).toBeVisible();
  });

  test("an unknown case study slug returns a 404", async ({ page }) => {
    const response = await page.goto("/work/does-not-exist");
    expect(response?.status()).toBe(404);
  });
});
