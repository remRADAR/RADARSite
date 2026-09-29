import { expect, test } from "@playwright/test";

test.describe("CMS Studio", () => {
  test("protects the editor and supports creating a draft with server-paginated filters", async ({ page }) => {
    let authenticated = false;
    let article = {
      id: "article-1",
      slug: "existing-signal",
      title: "Existing Signal",
      excerpt: "Existing excerpt",
      bodyHtml: "<p>Existing body</p>",
      status: "published",
      editorialType: "Press",
      magazineSubtype: "",
      projectSection: "",
      featuredImage: "https://cdn.example/existing.webp",
      featuredImageAlt: "Existing image",
      featuredImageCaption: "Existing caption",
      date: "2026-09-28",
      author: "Editorial Desk",
      tags: ["Afrobeats"],
      tagsApproved: ["Afrobeats"],
      tagsSuggested: ["Afrobeats", "Abuja"],
      categories: ["RADARArticles"],
      metaTitle: "Existing Signal",
      metaDescription: "Existing description",
      canonicalUrl: "https://radar.example/existing-signal",
      socialImage: "https://cdn.example/existing-social.webp",
    };

    await page.route("**/api/studio**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.endsWith("/session")) {
        await route.fulfill({ status: authenticated ? 200 : 401, contentType: "application/json", body: JSON.stringify({ authenticated }) });
        return;
      }
      if (request.method() === "POST") {
        authenticated = true;
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: true }) });
        return;
      }
      if (!authenticated) {
        await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Admin authentication required" }) });
        return;
      }
      if (request.method() === "GET" && url.searchParams.get("view") === "article") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ article }) });
        return;
      }
      if (request.method() === "GET" && url.searchParams.get("view") === "library") {
        const requestedType = url.searchParams.get("editorialType");
        const items = requestedType && requestedType !== article.editorialType ? [] : [{ ...article, bodyHtml: undefined }];
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items, pagination: { page: 1, pageSize: 12, total: items.length, pageCount: 1 }, taxonomy: { editorialTypes: ["Press", "Spotlight", "Magazine"], magazineSubtypes: ["Special Episode", "Magazine Episode"], projectSections: ["Motherland"] } }) });
        return;
      }
      if (request.method() === "PUT") {
        const body = JSON.parse(request.postData() || "{}");
        article = { ...article, ...(body.article || {}), status: body.article?.status || "draft" };
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ saved: true, article, summary: article }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ configured: false, settings: {} }) });
    });

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Admin password." })).toBeVisible();

    await page.getByLabel("Studio admin password").fill("test-password");
    await page.getByRole("button", { name: "Enter Studio" }).click();
    await expect(page.getByRole("heading", { name: /Editorial desk/ })).toBeVisible();
    await expect(page.getByText("Existing Signal")).toBeVisible();

    await page.getByRole("button", { name: "+ New article" }).click();
    await page.getByRole("textbox", { name: "Title", exact: true }).fill("New Abuja Signal");
    await page.locator("label").filter({ hasText: "Body" }).locator("textarea").fill("<p>Draft body</p>");
    await page.getByRole("button", { name: "Save article" }).click();
    await expect(page.getByRole("complementary").getByText("Draft saved to the shared CMS")).toBeVisible();

    await page.locator("aside select").first().selectOption("Spotlight");
    await expect(page.getByText("Page 1 / 1")).toBeVisible();
  });

  test("keeps unsafe editor preview content inside a sandboxed frame", async ({ page }) => {
    await page.route("**/api/studio**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.endsWith("/session")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: true }) });
      if (request.method() === "GET" && url.searchParams.get("view") === "library") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], pagination: { page: 1, pageSize: 12, total: 0, pageCount: 1 }, taxonomy: { editorialTypes: ["Press", "Spotlight", "Magazine"], magazineSubtypes: ["Special Episode", "Magazine Episode"], projectSections: ["Motherland"] } }) });
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ configured: false, settings: {} }) });
    });
    await page.goto("/admin");
    await page.getByRole("button", { name: "+ New article" }).click();
    await page.locator("label").filter({ hasText: "Body" }).locator("textarea").fill("<script>window.__cmsXss = true</script><img src=x onerror=window.__cmsXss = true>");
    await expect(page.locator('iframe[title="Article preview"]')).toHaveAttribute("sandbox", "");
  });

  test("keeps the public CMS routes available", async ({ page }) => {
    for (const route of ["/ontheradar/articles", "/ontheradar/magazine", "/motherland"]) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
    }
  });
});
