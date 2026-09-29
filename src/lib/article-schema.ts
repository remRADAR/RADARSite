import type { CmsRecord } from "@/lib/content-server";
import { articlePath } from "@/lib/editorial-normalization";
import { deriveEditorialTaxonomy } from "@/lib/cms-taxonomy";

export function buildArticleJsonLd(record: CmsRecord) {
  const taxonomy = deriveEditorialTaxonomy(record);
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
    publisher: { "@type": "Organization", name: "RADARCharts by REM" },
    mainEntityOfPage: { "@type": "WebPage", "@id": articlePath(record) },
    ...(image ? { image: [image] } : {}),
    ...(taxonomy.editorialType ? { articleSection: taxonomy.editorialType } : {}),
    ...(taxonomy.magazineSubtype ? { genre: taxonomy.magazineSubtype } : {}),
    ...(taxonomy.projectSection ? { about: { "@type": "Thing", name: taxonomy.projectSection } } : {}),
    ...(tags.length ? { keywords: tags.join(", ") } : {}),
  };
}
