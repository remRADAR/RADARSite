import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { readPublishedContent } from "@/lib/content-server";
import { findBySlug } from "@/lib/ia-content";
import { articlePath, normalizeEditorialRecord } from "@/lib/editorial-normalization";
import { getEffectiveImageUrl } from "@/lib/effective-image-url";
export const revalidate = 3600;
export const dynamicParams = false;

export async function generateStaticParams() {
  const { articles } = await readPublishedContent();
  return articles.map((article) => ({ article: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ article: string }> }): Promise<Metadata> {
  const { article } = await params;
  const { articles } = await readPublishedContent();
  const item = findBySlug(articles, article);
  if (!item) return { title: "Article" };

  const record = normalizeEditorialRecord(item);
  const canonical = articlePath(record);
  const image = getEffectiveImageUrl(record.imageUrl || record.featuredImage).effectiveUrl;
  return {
    title: record.metaTitle || record.title,
    description: record.metaDescription || record.excerpt,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: record.metaTitle || record.title,
      description: record.metaDescription || record.excerpt,
      ...(image ? { images: [{ url: image, alt: record.title }] } : {}),
      ...(record.publishedAt || record.date ? { publishedTime: record.publishedAt || record.date } : {}),
      ...(record.author ? { authors: [record.author] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: record.metaTitle || record.title,
      description: record.metaDescription || record.excerpt,
      ...(image ? { images: [image] } : {}),
    },
  };
}
export default async function ArticleDetail({ params }: { params: Promise<{ article: string }> }) { const { article } = await params; const { articles } = await readPublishedContent(); const item = findBySlug(articles, article); if (!item) notFound(); const record = normalizeEditorialRecord(item); const image = getEffectiveImageUrl(record.imageUrl || record.featuredImage).effectiveUrl; const schema = { "@context": "https://schema.org", "@type": "Article", headline: record.title, description: record.metaDescription || record.excerpt, datePublished: record.publishedAt || record.date, author: { "@type": "Person", name: record.author || "RADARCharts by REM" }, mainEntityOfPage: { "@type": "WebPage", "@id": articlePath(record) }, ...(image ? { image: [image] } : {}), ...(record.editorialType ? { articleSection: record.editorialType } : {}) }; return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} /><IaDetail item={item} kind="article" backPath="/ontheradar/articles" /></>; }
