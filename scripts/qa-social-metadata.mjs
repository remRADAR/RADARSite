import fs from "node:fs/promises";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:3101";
const routes = ["/", "/ontheradar/articles", "/ontheradar/articles/category/discovery-spot/page/1", "/ontheradar/articles/artist-spotlight-wealth-asuquo-abujas-livewire-afrobeats-star-on-a-relentless-rise"];
const bad = /(localhost|127\.0\.0\.1|vercel\.app|wordpress|supabase|radarsite-two)/i;
const get = (html, name, attribute = "property") => html.match(new RegExp(`<meta[^>]+${attribute}=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"))?.[1] || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attribute}=["']${name}["']`, "i"))?.[1] || "";
const canonical = (html) => html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] || "";
const results = [];
for (const route of routes) {
  const response = await fetch(`${base}${route}`);
  const html = await response.text();
  const item = { route, status: response.status, canonical: canonical(html), ogTitle: get(html, "og:title"), ogDescription: get(html, "og:description"), ogUrl: get(html, "og:url"), ogImage: get(html, "og:image"), twitterCard: get(html, "twitter:card", "name"), twitterTitle: get(html, "twitter:title", "name"), twitterImage: get(html, "twitter:image", "name"), issues: [] };
  if (response.status !== 200) item.issues.push(`HTTP ${response.status}`);
  for (const key of ["canonical", "ogUrl", "ogImage", "ogTitle", "ogDescription", "twitterCard", "twitterTitle", "twitterImage"]) if (!item[key]) item.issues.push(`missing ${key}`);
  for (const key of ["canonical", "ogUrl", "ogImage", "twitterImage"]) if (bad.test(item[key])) item.issues.push(`unsafe ${key}`);
  if (item.ogImage) {
    const imageUrl = new URL(item.ogImage);
    const imageRequestUrl = imageUrl.hostname === new URL(base).hostname || imageUrl.hostname === "radarcharts.net" ? `${base}${imageUrl.pathname}` : item.ogImage;
    const imageResponse = await fetch(imageRequestUrl, { method: "HEAD" });
    if (!imageResponse.ok) item.issues.push(`image HTTP ${imageResponse.status}`);
    if (!(imageResponse.headers.get("content-type") || "").startsWith("image/")) item.issues.push("image content-type is not image/*");
  }
  results.push(item);
}
const report = { generatedAt: new Date().toISOString(), base, ok: results.every((item) => item.issues.length === 0), results };
await fs.mkdir("qa-artifacts/social-metadata", { recursive: true });
await fs.writeFile("qa-artifacts/social-metadata/report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
