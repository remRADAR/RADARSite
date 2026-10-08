import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { readPublishedContent } from "@/lib/content-server";
import { findBySlug } from "@/lib/ia-content";
import { articlePath, normalizeEditorialRecord } from "@/lib/editorial-normalization";
import { buildArticleJsonLd, serializeJsonLd } from "@/lib/article-schema";
import { buildPageMetadata, canonicalPath } from "@/lib/seo";
import { ArticleSourceExcerpt } from "@/components/marketing/ArticleSourceExcerpt";
import { buildArticleSourceExcerpt } from "@/lib/source-excerpt";
import { articleSocialCardUrl } from "@/lib/social-card";
export const revalidate = 3600;
// CMS articles can be published after a deployment; resolve new published slugs on demand.
// The page still calls notFound() when the slug is absent from published content.
export const dynamicParams = true;
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
  const image = articleSocialCardUrl(record.slug || article);
  return buildPageMetadata({ title: record.metaTitle || record.title || "Article", description: record.metaDescription || record.excerpt, path: canonical, image, type: "article", indexable: record.noindex !== true, publishedTime: record.publishedAt || record.date, modifiedTime: typeof record.sourceModifiedAt === "string" ? record.sourceModifiedAt : typeof record.updatedAt === "string" ? record.updatedAt : undefined, authors: record.author ? [record.author] : undefined });
}
export default async function ArticleDetail({ params }: { params: Promise<{ article: string }> }) { const { article } = await params; const { articles } = await readPublishedContent(); const item = findBySlug(articles, article); if (!item) notFound(); const record = normalizeEditorialRecord(item); const schema = buildArticleJsonLd(record); const excerpt = buildArticleSourceExcerpt(record); return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} /><IaDetail item={item} kind="article" backPath="/ontheradar/articles" />{excerpt ? <div className="px-5 pb-16 md:px-10"><div className="mx-auto max-w-4xl"><ArticleSourceExcerpt excerpt={excerpt} /></div></div> : null}</>; }
