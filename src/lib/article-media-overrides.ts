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
const RHIA_BELLO_SLUG = "rhia-bello-invites-everyone-to-celebrate-connect-and-drink-up";
const RHIA_BELLO_FEATURED_IMAGE = "/editorial/rhia-bello-drink-up/featured.png";

const ONE_DOUBLE_SLUG = "1double-finds-joy-in-life-s-uncertainties-on-la-vida";
const ONE_DOUBLE_MEDIA = {
  featured: "/editorial/1double-la-vida/featured.webp",
  inline: [
    { src: "/editorial/1double-la-vida/article-1.webp", alt: "1DOUBLE !! in a contemplative portrait" },
    { src: "/editorial/1double-la-vida/article-2.webp", alt: "1DOUBLE !! seated in profile" },
  ],
} as const;

/**
 * Reconnects verified, durable site assets to editorial records whose source
 * image URLs are temporary. Overrides are slug-scoped so unrelated records
 * remain untouched.
 */
export function applyArticleMediaOverrides(record: CmsRecord): CmsRecord {
  if (record.slug === ONE_DOUBLE_SLUG) {
    const source = record.bodyHtml || record.body || "";
    let imageIndex = 0;
    const bodyHtml = source.replace(/<img\b[^>]*>/gi, (tag) => {
      const image = ONE_DOUBLE_MEDIA.inline[imageIndex++];
      if (!image) return tag;
      const withSource = tag.replace(/\bsrc=(["'])[^"']*\1/i, `src="${image.src}"`);
      return /\balt=(["'])[^"']*\1/i.test(withSource)
        ? withSource.replace(/\balt=(["'])[^"']*\1/i, `alt="${image.alt}"`)
        : withSource.replace(/\s*\/?>$/, ` alt="${image.alt}" />`);
    });

    return {
      ...record,
      imageUrl: ONE_DOUBLE_MEDIA.featured,
      featuredImage: ONE_DOUBLE_MEDIA.featured,
      socialImage: ONE_DOUBLE_MEDIA.featured,
      featuredImageAlt: "1DOUBLE !! performing live",
      bodyHtml: source ? bodyHtml : record.bodyHtml,
    };
  }

  if (record.slug === RHIA_BELLO_SLUG) {
    return {
      ...record,
      imageUrl: RHIA_BELLO_FEATURED_IMAGE,
      featuredImage: RHIA_BELLO_FEATURED_IMAGE,
      featuredImageAlt: record.featuredImageAlt || "Rhia Bello — Drink Up",
    };
  }
  if (record.slug !== TARGET_SLUG) return record;

  const source = record.bodyHtml || record.body || "";
  let imageIndex = 0;
  const bodyHtml = source.replace(/(<img\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi, (match, prefix: string, _url: string, suffix: string) => {
    const replacement = TARGET_MEDIA.inline[imageIndex++];
    return replacement ? `${prefix}${replacement}${suffix}` : match;
  });

  return {
    ...record,
    imageUrl: TARGET_MEDIA.featured,
    featuredImage: TARGET_MEDIA.featured,
    featuredImageAlt: record.featuredImageAlt || record.title || "Styling",
    bodyHtml: source ? bodyHtml : record.bodyHtml,
  };
}
