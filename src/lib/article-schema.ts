import type { CmsRecord } from "@/lib/content-server";
import { articlePath, normalizeEditorialRecord } from "@/lib/editorial-normalization";
import { deriveEditorialTaxonomy } from "@/lib/cms-taxonomy";
import { absoluteUrl } from "@/lib/seo";

export function buildArticleJsonLd(record: CmsRecord) {
  const taxonomy = deriveEditorialTaxonomy(record);
  const canonical = absoluteUrl(articlePath(normalizeEditorialRecord(record)));
  const image = typeof record.imageUrl === "string" && record.imageUrl ? record.imageUrl : typeof record.featuredImage === "string" && record.featuredImage ? record.featuredImage : "";
  const tags = Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === "string" && Boolean(tag.trim())) : [];
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: record.title || record.name || "Editorial record",
    description: record.metaDescription || record.excerpt || record.subtitle || "",
    ...(record.publishedAt || record.date ? { datePublished: record.publishedAt || record.date } : {}),
    ...((record.sourceModifiedAt || record.updatedAt) ? { dateModified: record.sourceModifiedAt || record.updatedAt } : {}),
    author: { "@type": "Person", name: record.author || "RADARCharts by REM" },
    publisher: { "@type": "Organization", name: "RADARCharts by REM", url: "https://radarcharts.net", logo: { "@type": "ImageObject", url: "https://radarcharts.net/radar-logo.webp" } },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    url: canonical,
    ...(image ? { image: [{ "@type": "ImageObject", url: absoluteUrl(image), caption: record.featuredImageAlt || record.title || record.name || "RADAR editorial image" }] } : {}),
    ...(taxonomy.editorialType ? { articleSection: taxonomy.editorialType } : {}),
    ...(taxonomy.magazineSubtype ? { genre: taxonomy.magazineSubtype } : {}),
    ...(taxonomy.projectSection ? { about: { "@type": "Thing", name: taxonomy.projectSection } } : {}),
    ...(tags.length ? { keywords: tags.join(", ") } : {}),
  };
}

/** Serialize JSON-LD as data so hostile text cannot terminate its script element. */
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
