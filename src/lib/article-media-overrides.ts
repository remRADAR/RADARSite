import type { CmsRecord } from "@/lib/content-server";

const TARGET_SLUG = "styling-is-choosing-life-with-aye-lawa-feat-wyza";
const TARGET_MEDIA = {
  featured: "/editorial/styling-is-choosing-life-with-aye-lawa-feat-wyza/featured.jpg",
  inline: [
    "/editorial/styling-is-choosing-life-with-aye-lawa-feat-wyza/article-2.jpg",
    "/editorial/styling-is-choosing-life-with-aye-lawa-feat-wyza/article-1.jpg",
    "/editorial/styling-is-choosing-life-with-aye-lawa-feat-wyza/featured.jpg",
  ],
} as const;

/**
 * Reconnects the supplied, verified source assets to the one newly published
 * article whose Google Docs image URLs have expired. This is intentionally
 * slug-scoped so unrelated editorial records remain untouched.
 */
export function applyArticleMediaOverrides(record: CmsRecord): CmsRecord {
  if (record.slug !== TARGET_SLUG) return record;

  const source = record.bodyHtml || record.body || "";
  const sourceUrls = [...source.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((url, index, values) => values.indexOf(url) === index);
  let bodyHtml = source;
  sourceUrls.slice(0, TARGET_MEDIA.inline.length).forEach((url, index) => {
    bodyHtml = bodyHtml.split(url).join(TARGET_MEDIA.inline[index]);
  });

  return {
    ...record,
    imageUrl: TARGET_MEDIA.featured,
    featuredImage: TARGET_MEDIA.featured,
    featuredImageAlt: record.featuredImageAlt || record.title || "Styling",
    bodyHtml: source ? bodyHtml : record.bodyHtml,
  };
}
