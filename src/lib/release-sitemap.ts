import { listReleaseLinks, type ReleaseLink } from "@/lib/release-links";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * Release-links sitemap.
 *
 * Every release link created through the RADARMusic pipeline gets its own
 * entry here — nothing is hard-coded per title. The entry carries:
 *
 *   - the release artwork as the featured image
 *   - the title as "[Artist Name] - [Name of Song]"
 *   - the excerpt "New Music from [Artist Name] stayAKTiV #OnTheRADAR."
 *
 * The sitemap protocol has no excerpt element, so the excerpt is emitted in
 * the companion RSS feed (buildReleaseFeedXml) where <description> is the
 * natural home for it. Both documents are generated from the same builder, so
 * a new release appears in both the moment it is published.
 */

export const RELEASE_SITEMAP_PATH = "/sitemap-releases.xml";
export const RELEASE_FEED_PATH = "/releases/feed.xml";

/** "[Artist Name] - [Name of Song]" */
export function releaseSitemapTitle(release: Pick<ReleaseLink, "artist" | "title">): string {
  return `${release.artist} - ${release.title}`;
}

/** "New Music from [Artist Name] stayAKTiV #OnTheRADAR." */
export function releaseSitemapExcerpt(release: Pick<ReleaseLink, "artist">): string {
  return `New Music from ${release.artist} stayAKTiV #OnTheRADAR.`;
}

/** Canonical public URL of a release link panel. */
export function releaseSitemapUrl(release: Pick<ReleaseLink, "slug">): string {
  return absoluteUrl(`/${release.slug}`);
}

/** Absolute artwork URL used as the featured image. */
export function releaseSitemapImage(release: Pick<ReleaseLink, "coverImage">): string {
  return absoluteUrl(release.coverImage);
}

export type ReleaseSitemapEntry = {
  url: string;
  title: string;
  excerpt: string;
  image: string;
  releaseDate: string;
  lastModified?: string;
};

function toIsoDate(value: string): string | undefined {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

/**
 * Build one entry per published release link. Ordering is newest release first
 * so the sitemap and the feed agree.
 */
export async function buildReleaseSitemapEntries(): Promise<ReleaseSitemapEntry[]> {
  const releases = (await listReleaseLinks())
    .filter((release) => release.status === "published")
    .filter((release) => Boolean(release.slug && release.title && release.artist && release.coverImage))
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));

  return releases.map((release) => ({
    url: releaseSitemapUrl(release),
    title: releaseSitemapTitle(release),
    excerpt: releaseSitemapExcerpt(release),
    image: releaseSitemapImage(release),
    releaseDate: release.releaseDate,
    lastModified: toIsoDate(release.updatedAt) ?? toIsoDate(release.releaseDate),
  }));
}

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] || character);
}

/**
 * Sitemap XML with the image and news extensions.
 *
 * <image:image> carries the artwork as the featured image and repeats the
 * "[Artist] - [Song]" title; <news:news> carries the same title in the form
 * news aggregators read.
 */
export function buildReleaseSitemapXml(entries: ReleaseSitemapEntry[]): string {
  const urls = entries.map((entry) => {
    const publicationDate = toIsoDate(entry.releaseDate);
    return [
      "  <url>",
      `    <loc>${escapeXml(entry.url)}</loc>`,
      ...(entry.lastModified ? [`    <lastmod>${escapeXml(entry.lastModified)}</lastmod>`] : []),
      "    <image:image>",
      `      <image:loc>${escapeXml(entry.image)}</image:loc>`,
      `      <image:title>${escapeXml(entry.title)}</image:title>`,
      "    </image:image>",
      "    <news:news>",
      "      <news:publication>",
      `        <news:name>${escapeXml(SITE_NAME)}</news:name>`,
      "        <news:language>en</news:language>",
      "      </news:publication>",
      ...(publicationDate ? [`      <news:publication_date>${escapeXml(publicationDate)}</news:publication_date>`] : []),
      `      <news:title>${escapeXml(entry.title)}</news:title>`,
      "    </news:news>",
      "  </url>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
    '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

/**
 * RSS 2.0 feed carrying the excerpt, which a sitemap cannot express.
 * Same entries, same order, same title and artwork.
 */
export function buildReleaseFeedXml(entries: ReleaseSitemapEntry[]): string {
  const items = entries.map((entry) => {
    const publicationDate = toIsoDate(entry.releaseDate);
    return [
      "    <item>",
      `      <title>${escapeXml(entry.title)}</title>`,
      `      <link>${escapeXml(entry.url)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(entry.url)}</guid>`,
      `      <description>${escapeXml(entry.excerpt)}</description>`,
      ...(publicationDate ? [`      <pubDate>${new Date(publicationDate).toUTCString()}</pubDate>`] : []),
      `      <media:content url="${escapeXml(entry.image)}" medium="image" />`,
      "    </item>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(`${SITE_NAME} — Release Links`)}</title>`,
    `    <link>${escapeXml(absoluteUrl("/releases"))}</link>`,
    `    <description>${escapeXml("Official pre-save and streaming links for releases distributed by The RADARMusic.")}</description>`,
    "    <language>en</language>",
    `    <atom:link href="${escapeXml(absoluteUrl(RELEASE_FEED_PATH))}" rel="self" type="application/rss+xml" />`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

export const RELEASE_SITEMAP_BASE_URL = SITE_URL;
