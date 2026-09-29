import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { buildPageMetadata } from "@/lib/seo";
import { findBySlug, releases } from "@/lib/ia-content";
export async function generateMetadata({ params }: { params: Promise<{ release: string }> }): Promise<Metadata> { const { release } = await params; const item = findBySlug(releases, release); return item ? buildPageMetadata({ title: item.metaTitle || item.title, description: item.metaDescription || item.description, path: `/radarmusic/releases/${item.slug}`, image: item.imageUrl || item.featuredImage }) : { title: "Release" }; }
export function generateStaticParams() { return releases.map((item) => ({ release: item.slug })); }
export default async function ReleaseDetail({ params }: { params: Promise<{ release: string }> }) { const { release } = await params; const item = findBySlug(releases, release); if (!item) notFound(); return <IaDetail item={item} kind="standard" backPath="/radarmusic/releases" />; }
