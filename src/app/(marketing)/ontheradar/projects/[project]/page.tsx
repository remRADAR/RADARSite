import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { findBySlug, radarProjects } from "@/lib/ia-content";
export function generateStaticParams() { return radarProjects.map((item) => ({ project: item.slug })); }
export default async function ProjectDetail({ params }: { params: Promise<{ project: string }> }) { const { project } = await params; const item = findBySlug(radarProjects, project); if (!item) notFound(); return <IaDetail item={item} kind="standard" backPath="/ontheradar/projects" />; }
