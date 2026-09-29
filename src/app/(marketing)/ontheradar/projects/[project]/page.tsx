import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { buildPageMetadata } from "@/lib/seo";
import { findBySlug, radarProjects } from "@/lib/ia-content";
export async function generateMetadata({ params }: { params: Promise<{ project: string }> }): Promise<Metadata> { const { project } = await params; const item = findBySlug(radarProjects, project); return item ? buildPageMetadata({ title: item.metaTitle || item.title, description: item.metaDescription || item.brief, path: `/ontheradar/projects/${item.slug}`, image: item.imageUrl || item.featuredImage }) : { title: "Project" }; }
export function generateStaticParams() { return radarProjects.map((item) => ({ project: item.slug })); }
export default async function ProjectDetail({ params }: { params: Promise<{ project: string }> }) { const { project } = await params; const item = findBySlug(radarProjects, project); if (!item) notFound(); return <IaDetail item={item} kind="standard" backPath="/ontheradar/projects" />; }
