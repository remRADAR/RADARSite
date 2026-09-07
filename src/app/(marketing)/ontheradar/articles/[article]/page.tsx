import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { readContent } from "@/lib/content-server";
import { findBySlug } from "@/lib/ia-content";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ article: string }> }) { const { article } = await params; const { articles } = await readContent(); const item = findBySlug(articles, article); return item ? { title: item.metaTitle || item.title, description: item.metaDescription || item.body } : { title: "Article" }; }
export default async function ArticleDetail({ params }: { params: Promise<{ article: string }> }) { const { article } = await params; const { articles } = await readContent(); const item = findBySlug(articles, article); if (!item) notFound(); return <IaDetail item={item} kind="article" backPath="/ontheradar/articles" />; }
