import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { readPublishedContent } from "@/lib/content-server";
import { findBySlug } from "@/lib/ia-content";
import { deriveEditorialTaxonomy } from "@/lib/cms-taxonomy";
export const revalidate = 3600;
export async function generateMetadata({ params }: { params: Promise<{ story: string }> }): Promise<Metadata> { const { story } = await params; const { magazine, articles } = await readPublishedContent(); const article = articles.find((item) => item.slug === story && deriveEditorialTaxonomy(item).editorialType === "Magazine"); const item = article || findBySlug(magazine, story); const description = item && ("subtitle" in item ? String(item.subtitle || "") : "description" in item ? String(item.description || "") : ""); return item ? buildPageMetadata({ title: item.metaTitle || item.title, description: item.metaDescription || description, path: article ? `/ontheradar/articles/${item.slug}` : `/ontheradar/magazine/${item.slug}`, image: item.imageUrl || item.featuredImage, type: "article" }) : { title: "Magazine" }; }
export default async function MagazineDetail({ params }: { params: Promise<{ story: string }> }) { const { story } = await params; const { magazine, articles } = await readPublishedContent(); const article = articles.find((item) => item.slug === story && deriveEditorialTaxonomy(item).editorialType === "Magazine"); const item = article || findBySlug(magazine, story); if (!item) notFound(); return <IaDetail item={item} kind={article ? "article" : "magazine"} backPath="/ontheradar/magazine" />; }
