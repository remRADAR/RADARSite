import { test, expect } from "@playwright/test";

test.describe("Case study page", () => {
  test("navigating from the work grid opens a case study with its key sections", async ({
    page,
  }) => {
    await page.goto("/work");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.getByRole("link", { name: /Mamuzo/i }).first().click();
    await expect(page).toHaveURL("/work/mamuzo-dark-era-peak-release");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Mamuzo Enters His DARK ERA"
    );
    await expect(page.getByText("The Signal")).toBeVisible();
    await expect(page.getByText("The Sound")).toBeVisible();
    await expect(page.getByText("Results")).toBeVisible();
    await expect(page.getByText("Credits")).toBeVisible();
    await expect(page.getByText("Next case study")).toBeVisible();
  });

  test("an unknown case study slug returns a 404", async ({ page }) => {
    const response = await page.goto("/work/does-not-exist");
    expect(response?.status()).toBe(404);
  });
});
