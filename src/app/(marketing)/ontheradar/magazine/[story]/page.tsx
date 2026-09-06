import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { findBySlug, magazine } from "@/lib/ia-content";
export function generateStaticParams() { return magazine.map((item) => ({ story: item.slug })); }
export default async function MagazineDetail({ params }: { params: Promise<{ story: string }> }) { const { story } = await params; const item = findBySlug(magazine, story); if (!item) notFound(); return <IaDetail item={item} kind="magazine" backPath="/ontheradar/magazine" />; }
