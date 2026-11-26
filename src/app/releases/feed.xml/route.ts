import { buildReleaseFeedXml, buildReleaseSitemapEntries } from "@/lib/release-sitemap";

export const revalidate = 300;

export async function GET() {
  const entries = await buildReleaseSitemapEntries();
  return new Response(buildReleaseFeedXml(entries), {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
