import type { CmsRecord } from "@/lib/content-server";
import { articlePath, normalizeEditorialRecord } from "@/lib/editorial-normalization";
import { deriveEditorialTaxonomy } from "@/lib/cms-taxonomy";
import { absoluteUrl, canonicalPath } from "@/lib/seo";

export function buildArticleJsonLd(record: CmsRecord) {
  const taxonomy = deriveEditorialTaxonomy(record);
  const normalized = normalizeEditorialRecord(record);
  const canonical = absoluteUrl(canonicalPath(normalized.canonicalUrl, articlePath(normalized)));
  const image = typeof record.imageUrl === "string" && record.imageUrl ? record.imageUrl : typeof record.featuredImage === "string" && record.featuredImage ? record.featuredImage : "";
  const tags = Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === "string" && Boolean(tag.trim())) : [];
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonical}#article`,
    headline: normalized.title || normalized.name || "Editorial record",
    description: normalized.metaDescription || normalized.excerpt || normalized.subtitle || "",
    ...(normalized.publishedAt || normalized.date ? { datePublished: normalized.publishedAt || normalized.date } : {}),
    ...((normalized.sourceModifiedAt || normalized.updatedAt) ? { dateModified: normalized.sourceModifiedAt || normalized.updatedAt } : {}),
    author: { "@type": "Person", name: normalized.author || "RADARCharts by REM" },
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
