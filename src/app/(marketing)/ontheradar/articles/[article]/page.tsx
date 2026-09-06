import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { articles, findBySlug } from "@/lib/ia-content";
export function generateStaticParams() { return articles.map((item) => ({ article: item.slug })); }
export default async function ArticleDetail({ params }: { params: Promise<{ article: string }> }) { const { article } = await params; const item = findBySlug(articles, article); if (!item) notFound(); return <IaDetail item={item} kind="article" backPath="/ontheradar/articles" />; }
