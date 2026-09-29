import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { readPublishedContent } from "@/lib/content-server";
import { findBySlug } from "@/lib/ia-content";
import { normalizeEditorialRecord } from "@/lib/editorial-normalization";
import { getEffectiveImageUrl } from "@/lib/effective-image-url";
import { publicSiteUrl, readPublicSiteOverrides, safeSocialImageUrl } from "@/lib/public-site";
import { StructuredData } from "@/components/StructuredData";
import { articleStructuredData, breadcrumbStructuredData } from "@/lib/seo-schema";
export const revalidate = 3600;
export async function generateMetadata({ params }: { params: Promise<{ story: string }> }): Promise<Metadata> { const { story } = await params; const { magazine } = await readPublishedContent(); const item = findBySlug(magazine, story); if (!item) return { title: "Magazine" }; const record = normalizeEditorialRecord(item); const settings = await readPublicSiteOverrides(); const title = record.metaTitle || record.title; const description = record.metaDescription || record.excerpt || record.subtitle; const canonical = `/ontheradar/magazine/${encodeURIComponent(record.slug)}`; const image = safeSocialImageUrl(getEffectiveImageUrl(record.imageUrl || record.featuredImage).effectiveUrl || settings.socialImage); return { title, description, alternates: { canonical }, openGraph: { type: "article", url: `${publicSiteUrl()}${canonical}`, siteName: settings.siteName, title, description, images: [{ url: image, alt: record.title }] }, twitter: { card: "summary_large_image", site: settings.xHandle, title, description, images: [image] } }; }
export default async function MagazineDetail({ params }: { params: Promise<{ story: string }> }) { const { story } = await params; const { magazine } = await readPublishedContent(); const item = findBySlug(magazine, story); if (!item) notFound(); const record = normalizeEditorialRecord(item); const canonical = `/ontheradar/magazine/${encodeURIComponent(record.slug)}`; const image = getEffectiveImageUrl(record.imageUrl || record.featuredImage).effectiveUrl; return <><StructuredData data={articleStructuredData(record, canonical, image || undefined)} /><StructuredData data={breadcrumbStructuredData([{ name: "RADARCharts", url: "/" }, { name: "Magazine", url: "/ontheradar/magazine" }, { name: record.title || "Story", url: canonical }])} /><IaDetail item={item} kind="magazine" backPath="/ontheradar/magazine" /></>; }
