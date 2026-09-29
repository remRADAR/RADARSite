import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { readPublishedContent } from "@/lib/content-server";
import { findBySlug } from "@/lib/ia-content";
import { articlePath, normalizeEditorialRecord } from "@/lib/editorial-normalization";
import { getEffectiveImageUrl } from "@/lib/effective-image-url";
import { buildArticleJsonLd, serializeJsonLd } from "@/lib/article-schema";
import { buildPageMetadata, breadcrumbStructuredData, canonicalPath } from "@/lib/seo";
import { StructuredData } from "@/components/StructuredData";
import { ArticleSourceExcerpt } from "@/components/marketing/ArticleSourceExcerpt";
import { buildArticleSourceExcerpt } from "@/lib/source-excerpt";
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
  const canonical = canonicalPath(record.canonicalUrl, articlePath(record));
  const image = getEffectiveImageUrl(record.imageUrl || record.featuredImage).effectiveUrl;
  return buildPageMetadata({ title: record.metaTitle || record.title || "Article", description: record.metaDescription || record.excerpt, path: canonical, image, type: "article", indexable: record.noindex !== true, publishedTime: record.publishedAt || record.date, modifiedTime: typeof record.sourceModifiedAt === "string" ? record.sourceModifiedAt : typeof record.updatedAt === "string" ? record.updatedAt : undefined, authors: record.author ? [record.author] : undefined });
}
export default async function ArticleDetail({ params }: { params: Promise<{ article: string }> }) { const { article } = await params; const { articles } = await readPublishedContent(); const item = findBySlug(articles, article); if (!item) notFound(); const record = normalizeEditorialRecord(item); const schema = buildArticleJsonLd(record); const excerpt = buildArticleSourceExcerpt(record); return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} /><StructuredData data={breadcrumbStructuredData([{ name: "Home", path: "/" }, { name: "RADARArticles", path: "/ontheradar/articles" }, { name: record.title || "Article", path: articlePath(record) }])} /><IaDetail item={item} kind="article" backPath="/ontheradar/articles" />{excerpt ? <div className="px-5 pb-16 md:px-10"><div className="mx-auto max-w-4xl"><ArticleSourceExcerpt excerpt={excerpt} /></div></div> : null}</>; }
