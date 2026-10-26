import { expect, test } from "@playwright/test";

const globeGif = "/media/homepage-cta-globe-transparent.gif";
const globePoster = "/media/homepage-cta-globe-poster.png";

async function revealCta(page: import("@playwright/test").Page) {
  await page.goto("/");
  const section = page.getByTestId("cta-section");
  await section.scrollIntoViewIfNeeded();
  await expect(section).toBeVisible();
  return section;
}

test("loads the local transparent globe and adapts its backdrop by viewport", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const section = await revealCta(page);
  const image = page.getByTestId("cta-globe");
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("src", globeGif);
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);

  const desktopBackground = await section.evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileBackground = await section.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(mobileBackground).not.toBe(desktopBackground);
});

test("shows a local static poster when the animation file fails", async ({ page }) => {
  await page.route("**/*homepage-cta-globe-transparent.gif*", (route) => route.abort());
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await revealCta(page);

  const poster = page.getByTestId("cta-globe-poster");
  await expect(poster).toBeVisible();
  await expect(poster).toHaveAttribute("src", globePoster);
  await expect.poll(() => poster.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
});

test("uses a static globe for reduced-motion preferences", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await revealCta(page);

  const poster = page.getByTestId("cta-globe-poster");
  await expect(poster).toBeVisible();
  await expect(poster).toHaveAttribute("src", globePoster);
  await expect.poll(() => poster.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
});
