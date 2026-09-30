import type { CmsRecord } from "@/lib/content-server";
import { absolutePublicUrl, publicSiteUrl } from "@/lib/public-site";
import { normalizeEditorialRecord } from "@/lib/editorial-normalization";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validDate(value: unknown) {
  const candidate = text(value);
  if (!candidate || Number.isNaN(Date.parse(candidate))) return "";
  return new Date(candidate).toISOString();
}

function uniqueStrings(values: unknown[]) {
  return [...new Set(values.map(text).filter(Boolean))];
}

export function articleStructuredData(input: CmsRecord, canonicalUrl: string, imageUrl?: string) {
  const record = normalizeEditorialRecord(input);
  const canonical = absolutePublicUrl(canonicalUrl);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonical}#article`,
    headline: record.title,
    description: record.metaDescription || record.excerpt || record.title,
    url: canonical,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    publisher: {
      "@type": "Organization",
      name: "RADARCharts by REM",
      url: publicSiteUrl(),
      logo: { "@type": "ImageObject", url: absolutePublicUrl("/radar-logo.webp") },
    },
    inLanguage: "en",
  };
  const author = text(record.author);
  const published = validDate(record.publishedAt || record.date);
  const modified = validDate(record.modifiedAt || record.updatedAt || record.modifiedDate);
  const section = text(record.sectionLabel || record.section);
  const keywords = uniqueStrings([...(record.tags || []), ...(record.categories || [])]);
  if (author) data.author = { "@type": "Person", name: author };
  if (published) data.datePublished = published;
  if (modified) data.dateModified = modified;
  if (section) data.articleSection = section;
  if (keywords.length) data.keywords = keywords.join(", ");
  if (imageUrl) data.image = [imageUrl];
  return data;
}

export function collectionPageStructuredData({ name, description, canonicalUrl, about }: { name: string; description: string; canonicalUrl: string; about?: string }) {
  const canonical = absolutePublicUrl(canonicalUrl);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonical}#collection`,
    name,
    description,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: "RADARCharts by REM", url: publicSiteUrl() },
    ...(about ? { about: { "@type": "Thing", name: about } } : {}),
  };
}

export function breadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: absolutePublicUrl(item.url) })),
  };
}

export function serializeJsonLd(data: Record<string, unknown>) {
  return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (character) => ({ "<": "\\u003c", ">": "\\u003e", "&": "\\u0026", " ": "\\u2028", " ": "\\u2029" })[character] || character);
}
