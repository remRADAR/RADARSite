import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { readPublishedContent } from "@/lib/content-server";
import { findBySlug } from "@/lib/ia-content";
import { articlePath, normalizeEditorialRecord } from "@/lib/editorial-normalization";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ article: string }> }): Promise<Metadata> {
  const { article } = await params;
  const { articles } = await readPublishedContent();
  const item = findBySlug(articles, article);
  if (!item) return { title: "Article" };

  const record = normalizeEditorialRecord(item);
  const canonical = articlePath(record);
  const image = record.imageUrl || record.featuredImage;
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
export default async function ArticleDetail({ params }: { params: Promise<{ article: string }> }) { const { article } = await params; const { articles } = await readPublishedContent(); const item = findBySlug(articles, article); if (!item) notFound(); return <IaDetail item={item} kind="article" backPath="/ontheradar/articles" />; }
