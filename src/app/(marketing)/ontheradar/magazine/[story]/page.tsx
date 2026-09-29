import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { readPublishedContent } from "@/lib/content-server";
import { findBySlug } from "@/lib/ia-content";
export const revalidate = 3600;
export async function generateMetadata({ params }: { params: Promise<{ story: string }> }): Promise<Metadata> { const { story } = await params; const { magazine } = await readPublishedContent(); const item = findBySlug(magazine, story); return item ? buildPageMetadata({ title: item.metaTitle || item.title, description: item.metaDescription || item.subtitle, path: `/ontheradar/magazine/${item.slug}`, image: item.imageUrl || item.featuredImage, type: "article" }) : { title: "Magazine" }; }
export default async function MagazineDetail({ params }: { params: Promise<{ story: string }> }) { const { story } = await params; const { magazine } = await readPublishedContent(); const item = findBySlug(magazine, story); if (!item) notFound(); return <IaDetail item={item} kind="magazine" backPath="/ontheradar/magazine" />; }
