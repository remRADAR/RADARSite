import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { findBySlug, releases } from "@/lib/ia-content";
export function generateStaticParams() { return releases.map((item) => ({ release: item.slug })); }
export default async function ReleaseDetail({ params }: { params: Promise<{ release: string }> }) { const { release } = await params; const item = findBySlug(releases, release); if (!item) notFound(); return <IaDetail item={item} kind="standard" backPath="/radarmusic/releases" />; }
