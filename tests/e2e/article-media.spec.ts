import { test, expect } from "@playwright/test";

const currentArticle = "/ontheradar/articles/gande-is-breaking-boundaries-with-insta-babe";
const localAssetArticle = "/ontheradar/articles/styling-is-choosing-life-with-aye-lawa-feat-wyza";

/** Waits until every article image has settled: loaded, or marked with the
 *  styled is-error placeholder, with no image still mid-retry. */
async function waitForArticleImagesToSettle(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll<HTMLImageElement>("article img")].every(
        (image) => image.complete && (image.naturalWidth > 0 || image.classList.contains("is-error")),
      ),
    null,
    { timeout: 30_000 },
  );
}

test.describe("article media resilience", () => {
  test("inline images are either loaded or carry the styled error placeholder", async ({ page }) => {
    await page.goto(currentArticle, { waitUntil: "domcontentloaded" });
    await waitForArticleImagesToSettle(page);
    const states = await page.locator(".editorial-body img").evaluateAll((images) =>
      images.map((image) => ({
        src: image.getAttribute("src") || "",
        loaded: (image as HTMLImageElement).naturalWidth > 0,
        marked: image.classList.contains("is-error") || image.classList.contains("is-ready"),
      })),
    );
    expect(states.length).toBeGreaterThan(0);
    for (const state of states) {
      // The sanitizer must not emit plain-http or protocol-relative sources.
      expect(state.src.startsWith("http://")).toBe(false);
      expect(state.src.startsWith("//")).toBe(false);
      // Every inline image resolves to a real bitmap or a branded placeholder.
      expect(state.loaded || state.marked).toBe(true);
    }
  });

  test("failed media never leaves an unstyled broken image element behind", async ({ page }) => {
    await page.goto(currentArticle, { waitUntil: "domcontentloaded" });
    await waitForArticleImagesToSettle(page);
    const broken = await page.locator("article img").evaluateAll((images) =>
      images.filter((image) => {
        const img = image as HTMLImageElement;
        return img.complete && img.naturalWidth === 0 && !img.classList.contains("is-error");
      }).length,
    );
    // ResilientImage swaps failed hero media for a branded placeholder div, and
    // the enhancer marks failed inline images is-error.
    expect(broken).toBe(0);
  });

  test("articles with local media overrides render real images", async ({ page }) => {
    await page.goto(localAssetArticle, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => [...document.querySelectorAll<HTMLImageElement>("img")].every((image) => image.complete),
      null,
      { timeout: 30_000 },
    );
    const loaded = await page.locator("img").evaluateAll((images) => images.filter((image) => (image as HTMLImageElement).naturalWidth > 0).length);
    expect(loaded).toBeGreaterThan(0);
  });

  test("embeds settle into ready or error state and spotify wrappers keep player height", async ({ page }) => {
    await page.goto(currentArticle, { waitUntil: "domcontentloaded" });
    await page
      .waitForFunction(
        () =>
          [...document.querySelectorAll(".editorial-embed")].every(
            (embed) => embed.classList.contains("is-ready") || embed.classList.contains("is-error"),
          ),
        null,
        { timeout: 30_000 },
      )
      .catch(() => {});
    const embeds = await page.locator(".editorial-embed").evaluateAll((wrappers) =>
      wrappers.map((wrapper) => ({
        classes: wrapper.className,
        height: Math.round(wrapper.getBoundingClientRect().height),
      })),
    );
    for (const embed of embeds) {
      expect(embed.classes).toMatch(/is-ready|is-error/);
      if (embed.classes.includes("editorial-embed--spotify-track")) expect(embed.height).toBe(152);
      if (embed.classes.includes("editorial-embed--spotify-large")) expect(embed.height).toBe(352);
    }
  });
});
