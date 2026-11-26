import { buildReleaseSitemapEntries, buildReleaseSitemapXml } from "@/lib/release-sitemap";

export const revalidate = 300;

export async function GET() {
  const entries = await buildReleaseSitemapEntries();
  return new Response(buildReleaseSitemapXml(entries), {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
