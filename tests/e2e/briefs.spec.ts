import { test, expect } from "@playwright/test";

test.describe("Brief creation", () => {
  test("creating a new brief through the wizard shows it in the briefs list", async ({
    page,
  }) => {
    await page.goto("/briefs/new");

    const briefTitle = `Test Brief ${Date.now()}`;

    // Step 1 — project
    await page
      .getByPlaceholder("e.g. Holiday capsule packaging")
      .fill(briefTitle);
    await page.getByText("Select a type", { exact: true }).click();
    await page.getByRole("option", { name: "Packaging" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2 — budget & timeline
    await page.getByText("Select a range", { exact: true }).click();
    await page.getByRole("option", { name: /\$40k/ }).click();
    await page.getByText("Select a timeline", { exact: true }).click();
    await page.getByRole("option", { name: /weeks/ }).first().click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3 — details
    await page
      .getByPlaceholder("What are we making, and why now?")
      .fill("End-to-end Playwright test submission.");
    await page.getByRole("button", { name: "Submit brief" }).click();

    await expect(page).toHaveURL("/briefs");
    await expect(page.getByText(briefTitle)).toBeVisible();
  });

  test("the wizard blocks advancing past step 1 until required fields are filled", async ({
    page,
  }) => {
    await page.goto("/briefs/new");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByText("Please fill in all fields before continuing.")
    ).toBeVisible();
  });
});
