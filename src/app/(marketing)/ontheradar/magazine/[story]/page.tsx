import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { readContent } from "@/lib/content-server";
import { findBySlug } from "@/lib/ia-content";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ story: string }> }) { const { story } = await params; const { magazine } = await readContent(); const item = findBySlug(magazine, story); return item ? { title: item.metaTitle || item.title, description: item.metaDescription || item.subtitle } : { title: "Magazine" }; }
export default async function MagazineDetail({ params }: { params: Promise<{ story: string }> }) { const { story } = await params; const { magazine } = await readContent(); const item = findBySlug(magazine, story); if (!item) notFound(); return <IaDetail item={item} kind="magazine" backPath="/ontheradar/magazine" />; }
