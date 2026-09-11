import { test, expect } from "@playwright/test";

const marketingRoutes = [
  "/",
  "/about",
  "/about/our-story",
  "/about/ecosystem",
  "/motherland",
  "/ontheradar",
  "/ontheradar/articles",
  "/ontheradar/magazine",
  "/ontheradar/projects",
  "/ontheradar/events",
  "/radarmusic",
  "/radarmusic/artists",
  "/radarmusic/releases",
  "/work",
  "/work/luna-vale-first-light",
  "/privacy",
  "/terms",
];

test.describe("Public marketing header", () => {
  for (const route of marketingRoutes) {
    test(`renders on ${route}`, async ({ page }) => {
      await page.goto(route);
      const header = page.getByRole("banner");
      await expect(header).toBeVisible();
      await expect(header.getByRole("link", { name: "remRADAR — home" })).toBeVisible();
    });
  }
});
