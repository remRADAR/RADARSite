import type { Metadata } from "next";

export const SITE_URL = "https://radarcharts.net";
export const SITE_NAME = "RADARCharts by REM";
export const SITE_DESCRIPTION = "RADARCharts by REM is a Nigerian and African music discovery, media, culture, artist-development, and intelligence platform.";
export const DEFAULT_SOCIAL_IMAGE = "/radar-logo.webp";

export function absoluteUrl(pathOrUrl: string): string {
  try {
    const url = new URL(pathOrUrl, SITE_URL);
    if (url.protocol === "http:" && url.hostname === "radarcharts.net") url.protocol = "https:";
    return url.toString();
  } catch {
    return SITE_URL;
  }
}

export function canonicalPath(pathOrUrl: string | undefined, fallbackPath: string): string {
  const value = (pathOrUrl || fallbackPath).trim();
  try {
    const url = new URL(value, SITE_URL);
    if (url.hostname !== "radarcharts.net" && url.hostname !== "www.radarcharts.net") return fallbackPath;
    url.protocol = "https:";
    url.hostname = "radarcharts.net";
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.pathname;
  } catch {
    return fallbackPath;
  }
}

export function cleanDescription(value: unknown, fallback = SITE_DESCRIPTION): string {
  const text = typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
  return (text || fallback).slice(0, 160);
}

export function buildPageMetadata(input: {
  title: string;
  description?: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  indexable?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
}): Metadata {
  const canonical = canonicalPath(undefined, input.path);
  const title = input.title.trim() || SITE_NAME;
  const description = cleanDescription(input.description);
  const image = input.image ? absoluteUrl(input.image) : absoluteUrl(DEFAULT_SOCIAL_IMAGE);
  const indexable = input.indexable !== false;
  return {
    title,
    description,
    alternates: { canonical },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      type: input.type || "website",
      url: absoluteUrl(canonical),
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: image, alt: title }],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
      ...(input.authors?.length ? { authors: input.authors } : {}),
    },
    twitter: { card: "summary_large_image", title, description, images: [image], site: "@radarcharts", creator: "@radarcharts" },
  };
}

export function websiteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/ontheradar/articles?type={search_term_string}`, "query-input": "required name=search_term_string" },
  };
}

export function breadcrumbStructuredData(items: Array<{ name: string; path: string }>) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: absoluteUrl(canonicalPath(undefined, item.path)) })) };
}

export function webPageStructuredData(input: { name: string; description?: string; path: string; type?: "WebPage" | "CollectionPage" | "ProfilePage" }) {
  return { "@context": "https://schema.org", "@type": input.type || "WebPage", name: input.name, description: cleanDescription(input.description), url: absoluteUrl(canonicalPath(undefined, input.path)), isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL } };
}
