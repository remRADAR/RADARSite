import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { readPublishedContent } from "@/lib/content-server";
import { findBySlug } from "@/lib/ia-content";
import { articlePath, normalizeEditorialRecord } from "@/lib/editorial-normalization";
import { getEffectiveImageUrl } from "@/lib/effective-image-url";
import { publicSiteUrl, readPublicSiteOverrides, safeSocialImageUrl } from "@/lib/public-site";
import { StructuredData } from "@/components/StructuredData";
import { articleStructuredData, breadcrumbStructuredData } from "@/lib/seo-schema";
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
  const settings = await readPublicSiteOverrides();
  const image = safeSocialImageUrl(getEffectiveImageUrl(record.imageUrl || record.featuredImage).effectiveUrl || settings.socialImage);
  const title = record.metaTitle || record.title;
  const description = record.metaDescription || record.excerpt;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: `${publicSiteUrl()}${canonical}`,
      siteName: settings.siteName,
      title,
      description,
      images: [{ url: image, alt: record.title }],
      ...(record.publishedAt || record.date ? { publishedTime: record.publishedAt || record.date } : {}),
      ...(record.author ? { authors: [record.author] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      site: settings.xHandle || "@radarcharts",
      title,
      description,
      images: [image],
    },
  };
}
export default async function ArticleDetail({ params }: { params: Promise<{ article: string }> }) { const { article } = await params; const { articles } = await readPublishedContent(); const item = findBySlug(articles, article); if (!item) notFound(); const record = normalizeEditorialRecord(item); const image = getEffectiveImageUrl(record.imageUrl || record.featuredImage).effectiveUrl; const canonical = articlePath(record); return <><StructuredData data={articleStructuredData(record, canonical, image || undefined)} /><StructuredData data={breadcrumbStructuredData([{ name: "RADARCharts", url: "/" }, { name: "RADARArticles", url: "/ontheradar/articles" }, { name: record.title || "Article", url: canonical }])} /><IaDetail item={item} kind="article" backPath="/ontheradar/articles" /></>; }
